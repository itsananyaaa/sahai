from typing import Any, Optional
from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse
import uuid

class SahaiException(HTTPException):
    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        details: Optional[Any] = None
    ):
        super().__init__(status_code=status_code, detail=message)
        self.code = code
        self.message = message
        self.details = details

def error_response(status_code: int, code: str, message: str, details: Optional[Any] = None, request_id: Optional[str] = None):
    return JSONResponse(
        status_code=status_code,
        content={
            "error": {
                "code": code,
                "message": message,
                "details": details or {},
                "request_id": request_id or str(uuid.uuid4())
            }
        }
    )
