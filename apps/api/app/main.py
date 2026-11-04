import uuid
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from app.config import settings
from app.core.exceptions import SahaiException, error_response
from app.api.v1 import (
    auth, cases, visits, assessments, referrals,
    follow_ups, sync, analytics, audit, facilities, health
)

app = FastAPI(
    title="SahAI Maternal Health Co-Pilot API",
    description="Offline-first decision support API for ASHA workers and PHC clinicians. Built for university technical expo.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def enforce_csrf_for_cookie_mutations(request: Request, call_next):
    unsafe_methods = {"POST", "PUT", "PATCH", "DELETE"}
    uses_cookie_auth = bool(request.cookies.get("sahai_access_token"))
    uses_header_auth = bool(request.headers.get("Authorization"))
    exempt_paths = {"/api/v1/auth/login", "/api/v1/auth/refresh"}
    if (
        request.method in unsafe_methods
        and uses_cookie_auth
        and not uses_header_auth
        and request.url.path not in exempt_paths
        and request.headers.get("X-CSRF-Token") != request.cookies.get("sahai_csrf_token")
    ):
        return error_response(
            status_code=403,
            code="CSRF_TOKEN_INVALID",
            message="A valid CSRF token is required for this action.",
            request_id=getattr(request.state, "request_id", str(uuid.uuid4())),
        )
    return await call_next(request)

# Security Headers Middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Content-Security-Policy"] = "default-src 'self'; connect-src 'self' http://localhost:8000 http://127.0.0.1:8000; img-src 'self' data:; style-src 'self' 'unsafe-inline'; font-src 'self'; frame-ancestors 'none'"
    return response

# Custom Exception Handlers
@app.exception_handler(SahaiException)
async def sahai_exception_handler(request: Request, exc: SahaiException):
    req_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    return error_response(
        status_code=exc.status_code,
        code=exc.code,
        message=exc.message,
        details=exc.details,
        request_id=req_id
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    req_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    return error_response(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        code="VALIDATION_ERROR",
        message="Request validation failed. Check parameters.",
        details=exc.errors(),
        request_id=req_id
    )

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    req_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    # Do not leak stack trace to client
    return error_response(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        code="INTERNAL_SERVER_ERROR",
        message="An unexpected server error occurred.",
        details={"hint": "Contact system administrator with the request_id."},
        request_id=req_id
    )

# Include v1 Routers
app.include_router(health.router, prefix="/api/v1")
app.include_router(auth.router, prefix="/api/v1")
app.include_router(cases.router, prefix="/api/v1")
app.include_router(visits.router, prefix="/api/v1")
app.include_router(assessments.router, prefix="/api/v1")
app.include_router(referrals.router, prefix="/api/v1")
app.include_router(follow_ups.router, prefix="/api/v1")
app.include_router(sync.router, prefix="/api/v1")
app.include_router(analytics.router, prefix="/api/v1")
app.include_router(audit.router, prefix="/api/v1")
app.include_router(facilities.router, prefix="/api/v1")

@app.get("/")
def root():
    return {
        "app": "SahAI Maternal Health Co-Pilot",
        "version": "1.0.0",
        "docs": "/docs",
        "demo_mode": settings.SAHAI_DEMO_MODE
    }
