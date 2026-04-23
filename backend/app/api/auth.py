"""Authentication endpoints for staff personas."""

from fastapi import APIRouter, HTTPException, status

from app.core.security import authenticate_staff, create_access_token
from app.schemas import LoginRequest, TokenResponse

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(credentials: LoginRequest):
    principal = authenticate_staff(credentials.username, credentials.password)
    if not principal:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    return TokenResponse(
        access_token=create_access_token(principal),
        username=principal.username,
        role=principal.role,
    )
