from fastapi import APIRouter, Depends, Response, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, RoleEnum
from app.schemas.auth import LoginRequest, LoginResponse, UserResponse
from app.core.security import verify_password, create_access_token, create_refresh_token, decode_token, generate_csrf_token
from app.core.exceptions import SahaiException
from app.core.rbac import get_current_user
from app.core.audit import record_audit_event
from app.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=LoginResponse)
def login(req: LoginRequest, response: Response, request: Request, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email.lower(), User.is_active == True).first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise SahaiException(
            status_code=401,
            code="INVALID_CREDENTIALS",
            message="Invalid email address or password provided."
        )

    access_token = create_access_token({"sub": user.id, "role": user.role})
    refresh_token = create_refresh_token({"sub": user.id, "role": user.role})

    # Set HttpOnly, SameSite=Lax cookies
    response.set_cookie(
        key="sahai_access_token",
        value=access_token,
        httponly=True,
        samesite="lax",
        secure=settings.SAHAI_ENV == "production",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )
    response.set_cookie(
        key="sahai_refresh_token",
        value=refresh_token,
        httponly=True,
        samesite="lax",
        secure=settings.SAHAI_ENV == "production",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400
    )
    response.set_cookie(
        key="sahai_csrf_token",
        value=generate_csrf_token(),
        httponly=False,
        samesite="lax",
        secure=settings.SAHAI_ENV == "production",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
    )

    record_audit_event(
        db=db,
        actor=user,
        action="USER_LOGIN",
        entity="user",
        entity_id=user.id,
        ip_address=request.client.host if request.client else None
    )

    return LoginResponse(
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )

@router.post("/refresh", response_model=LoginResponse)
def refresh(request: Request, response: Response, db: Session = Depends(get_db)):
    refresh_token = request.cookies.get("sahai_refresh_token")
    if not refresh_token:
        raise SahaiException(
            status_code=401,
            code="REFRESH_TOKEN_MISSING",
            message="No refresh token cookie found."
        )

    payload = decode_token(refresh_token)
    user_id = payload.get("sub")
    token_type = payload.get("type")
    if not user_id or token_type != "refresh":
        raise SahaiException(
            status_code=401,
            code="REFRESH_TOKEN_INVALID",
            message="Invalid or expired refresh token."
        )

    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user:
        raise SahaiException(status_code=401, code="USER_NOT_FOUND", message="User not found.")

    new_access_token = create_access_token({"sub": user.id, "role": user.role})
    response.set_cookie(
        key="sahai_access_token",
        value=new_access_token,
        httponly=True,
        samesite="lax",
        secure=settings.SAHAI_ENV == "production",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )
    response.set_cookie(
        key="sahai_csrf_token",
        value=generate_csrf_token(),
        httponly=False,
        samesite="lax",
        secure=settings.SAHAI_ENV == "production",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
    )

    return LoginResponse(
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )

@router.post("/logout")
def logout(response: Response, request: Request, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    response.delete_cookie("sahai_access_token")
    response.delete_cookie("sahai_refresh_token")
    response.delete_cookie("sahai_csrf_token")
    
    record_audit_event(
        db=db,
        actor=current_user,
        action="USER_LOGOUT",
        entity="user",
        entity_id=current_user.id,
        ip_address=request.client.host if request.client else None
    )
    return {"message": "Logged out successfully"}

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)
