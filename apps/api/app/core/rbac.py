from typing import Optional, List
from fastapi import Depends, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, RoleEnum
from app.models.case import MaternalCase
from app.core.security import decode_token
from app.core.exceptions import SahaiException

def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    # 1. Try Authorization header (Bearer token)
    auth_header = request.headers.get("Authorization")
    token = None
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
    
    # 2. Try HttpOnly Cookie
    if not token:
        token = request.cookies.get("sahai_access_token")

    if not token:
        raise SahaiException(
            status_code=401,
            code="AUTH_TOKEN_MISSING",
            message="Authentication credentials were not provided."
        )

    payload = decode_token(token)
    user_id = payload.get("sub")
    if not user_id:
        raise SahaiException(
            status_code=401,
            code="AUTH_TOKEN_INVALID",
            message="Invalid or expired authentication token."
        )

    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user:
        raise SahaiException(
            status_code=401,
            code="AUTH_USER_NOT_FOUND",
            message="User account associated with this token is not active or not found."
        )

    return user

def require_roles(allowed_roles: List[RoleEnum]):
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        user_role = RoleEnum(current_user.role)
        if user_role not in allowed_roles:
            raise SahaiException(
                status_code=403,
                code="FORBIDDEN_ROLE",
                message=f"Access denied. Required roles: {[r.value for r in allowed_roles]}, current: {user_role.value}"
            )
        return current_user
    return role_checker

def verify_case_access(case: MaternalCase, current_user: User):
    """
    Object-level access check enforcing tenant and catchment isolation to prevent IDOR:
    - ASHA: Only assigned cases.
    - ANM_PHC: Cases whose nearest facility matches the ANM's facility.
    - District Admin: De-identified only; identifiable case detail access forbidden.
    """
    if current_user.role == RoleEnum.ASHA.value:
        if case.assigned_asha_id != current_user.id:
            raise SahaiException(
                status_code=403,
                code="CASE_ACCESS_DENIED",
                message="ASHA workers may only access their own assigned cases."
            )
    elif current_user.role == RoleEnum.ANM_PHC.value:
        if current_user.facility_id and case.nearest_facility_id != current_user.facility_id:
            raise SahaiException(
                status_code=403,
                code="CASE_FACILITY_MISMATCH",
                message="PHC clinicians may only access cases within their facility catchment."
            )
    elif current_user.role == RoleEnum.DISTRICT_ADMIN.value:
        raise SahaiException(
            status_code=403,
            code="DISTRICT_ADMIN_CASE_ACCESS_RESTRICTED",
            message="District administrators may only access aggregate, de-identified analytics; identifiable patient detail is restricted."
        )
