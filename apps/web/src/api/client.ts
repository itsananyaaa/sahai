export interface ApiError {
  code: string;
  message: string;
  details?: any;
  request_id?: string;
}

export class ApiException extends Error {
  code: string;
  details?: any;
  status: number;

  constructor(status: number, code: string, message: string, details?: any) {
    super(message);
    this.name = "ApiException";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("sahai_auth_token");
  const headers = new Headers(options.headers || {});
  
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  const csrfToken = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith("sahai_csrf_token="))
    ?.split("=")[1];
  if (csrfToken && !headers.has("X-CSRF-Token")) {
    headers.set("X-CSRF-Token", decodeURIComponent(csrfToken));
  }

  const url = endpoint.startsWith("http") ? endpoint : `/api/v1${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: "include" // Send HttpOnly cookies
    });

    if (response.status === 204) {
      return {} as T;
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const err = data.error || {};
      throw new ApiException(
        response.status,
        err.code || "UNKNOWN_ERROR",
        err.message || response.statusText,
        err.details
      );
    }

    return data as T;
  } catch (error: any) {
    if (error instanceof ApiException) {
      throw error;
    }
    // Network / offline error
    throw new ApiException(0, "NETWORK_ERROR", "Unable to connect to server. Running in offline mode.");
  }
}
