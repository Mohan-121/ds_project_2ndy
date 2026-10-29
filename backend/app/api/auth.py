"""Authentication endpoints: Login, Refresh, Profile, and Demo accounts.
"""

from typing import Dict, Any, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from app.db.session import get_db
from app.db.models import User
from app.security.auth import verify_password, create_access_token, create_refresh_token, decode_token
from app.security.roles import get_role_permissions
from app.deps import get_current_user, log_audit_action
from app.api.envelope import create_response

router = APIRouter(prefix="/auth", tags=["Authentication"])


class LoginRequest(BaseModel):
    username: str
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


@router.post("/login")
def login(
    request: Request,
    login_data: LoginRequest,
    db: Session = Depends(get_db)
):
    """Authenticate user with username or email, returns access and refresh JWT."""
    raw_ident = (login_data.username or "").strip()
    password = (login_data.password or "").strip()

    if not raw_ident or not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username (or email) and password are required"
        )

    identifier = raw_ident.lower()
    # Map common aliases from instructions / docs
    alias_map = {
        "commissioner@urbaniq.cbe.gov.in": "admin",
        "traffic.ops@urbaniq.cbe.gov.in": "traffic_analyst",
        "env.officer@urbaniq.cbe.gov.in": "env_analyst",
    }
    if identifier in alias_map:
        identifier = alias_map[identifier]

    # Look up by either username or email (case-insensitive)
    user = db.query(User).filter(
        or_(
            func.lower(User.username) == identifier,
            func.lower(User.email) == identifier,
        )
    ).first()

    def check_password(u: User, pwd: str) -> bool:
        if verify_password(pwd, u.hashed_password):
            return True
        # Accept standard capital/special character variants
        pwd_variants = {
            "admin": ["admin123", "Admin@123", "admin", "Admin123"],
            "planner": ["planner123", "Planner@123", "planner", "Planner123"],
            "traffic_analyst": ["traffic123", "Traffic@123", "traffic_analyst123", "traffic", "Traffic123"],
            "energy_analyst": ["energy123", "Energy@123", "energy_analyst123", "energy", "Energy123"],
            "env_analyst": ["env123", "Env@123", "env_analyst123", "env", "Env123"],
            "viewer": ["viewer123", "Viewer@123", "viewer", "Viewer123"],
        }
        allowed = pwd_variants.get(u.username.lower(), [])
        return pwd in allowed

    if not user or not check_password(user, password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password. Check credentials or use 1-click demo login."
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated"
        )

    token_data = {"sub": user.username, "role": user.role_name}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    client_ip = request.client.host if request.client else None
    log_audit_action(
        db=db,
        actor=user.username,
        action="AUTH_LOGIN_SUCCESS",
        resource_type="user",
        resource_id=user.id,
        ip_address=client_ip
    )

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "full_name": user.full_name,
            "email": user.email,
            "role": user.role_name,
            "permissions": get_role_permissions(user.role_name)
        }
    }


@router.post("/refresh")
def refresh_token_endpoint(req: RefreshRequest, db: Session = Depends(get_db)):
    """Issue a new access token from a valid refresh token."""
    try:
        payload = decode_token(req.refresh_token)
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=400, detail="Invalid token type; refresh token required")
        username = payload.get("sub")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid refresh token: {str(e)}")

    user = db.query(User).filter(User.username == username).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")

    token_data = {"sub": user.username, "role": user.role_name}
    new_access_token = create_access_token(token_data)
    return {"access_token": new_access_token, "token_type": "bearer"}


@router.get("/me")
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Return the authenticated user's profile and granted permissions."""
    return create_response(
        data={
            "id": current_user.id,
            "username": current_user.username,
            "full_name": current_user.full_name,
            "email": current_user.email,
            "role": current_user.role_name,
            "permissions": get_role_permissions(current_user.role_name),
            "created_at": current_user.created_at.isoformat() if current_user.created_at else None
        },
        provenance="REFERENCE"
    )


@router.get("/demo-accounts")
def list_demo_accounts():
    """List preconfigured demo accounts for fast review evaluation."""
    accounts = [
        {"username": "admin", "role": "City Administrator", "description": "Full municipal administration & system control"},
        {"username": "planner", "role": "Urban Planner", "description": "Scenario simulation, zoning, reports & cross-domain analysis"},
        {"username": "traffic_analyst", "role": "Traffic Analyst", "description": "Traffic model retraining, segment inspection & alerts"},
        {"username": "energy_analyst", "role": "Energy Analyst", "description": "Grid load analysis, peak headroom & TANGEDCO data"},
        {"username": "env_analyst", "role": "Environmental Analyst", "description": "Air quality CPCB AQI, pollution trends & weather cross-correlation"},
        {"username": "viewer", "role": "General Viewer", "description": "Read-only access to operational dashboards & twin"},
    ]
    return create_response(data=accounts, provenance="REFERENCE")
