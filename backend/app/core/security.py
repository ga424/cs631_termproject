"""JWT authentication helpers for staff-facing rental operations."""

import base64
import hashlib
import hmac
import json
from datetime import datetime, timedelta
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

from app.core.config import settings

bearer_scheme = HTTPBearer(auto_error=False)


class StaffPrincipal(BaseModel):
    username: str
    role: str


def _b64url_encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


def _b64url_decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(f"{value}{padding}")


def _sign(message: str) -> str:
    digest = hmac.new(
        settings.jwt_secret_key.encode("utf-8"),
        message.encode("ascii"),
        hashlib.sha256,
    ).digest()
    return _b64url_encode(digest)


def _staff_users() -> dict[str, dict[str, str]]:
    users: dict[str, dict[str, str]] = {}
    for record in settings.staff_users.split(","):
        parts = [part.strip() for part in record.split(":")]
        if len(parts) != 3 or not all(parts):
            continue
        username, password, role = parts
        users[username] = {"password": password, "role": role}
    return users


def authenticate_staff(username: str, password: str) -> StaffPrincipal | None:
    user = _staff_users().get(username)
    if not user or not hmac.compare_digest(user["password"], password):
        return None
    return StaffPrincipal(username=username, role=user["role"])


def create_access_token(principal: StaffPrincipal) -> str:
    now = datetime.utcnow()
    expires_at = now + timedelta(minutes=settings.jwt_access_token_minutes)
    header = {"alg": settings.jwt_algorithm, "typ": "JWT"}
    payload = {
        "sub": principal.username,
        "role": principal.role,
        "iat": int(now.timestamp()),
        "exp": int(expires_at.timestamp()),
    }

    encoded_header = _b64url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    encoded_payload = _b64url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signing_input = f"{encoded_header}.{encoded_payload}"
    return f"{signing_input}.{_sign(signing_input)}"


def decode_access_token(token: str) -> StaffPrincipal:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired authentication token",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        encoded_header, encoded_payload, signature = token.split(".")
        signing_input = f"{encoded_header}.{encoded_payload}"
        expected_signature = _sign(signing_input)
        if not hmac.compare_digest(signature, expected_signature):
            raise credentials_error

        header = json.loads(_b64url_decode(encoded_header))
        payload = json.loads(_b64url_decode(encoded_payload))
    except Exception as exc:
        if isinstance(exc, HTTPException):
            raise
        raise credentials_error from exc

    if header.get("alg") != settings.jwt_algorithm:
        raise credentials_error

    expires_at = payload.get("exp")
    if not isinstance(expires_at, int) or datetime.utcnow().timestamp() >= expires_at:
        raise credentials_error

    username = payload.get("sub")
    role = payload.get("role")
    if not isinstance(username, str) or not isinstance(role, str):
        raise credentials_error

    return StaffPrincipal(username=username, role=role)


def require_authenticated(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> StaffPrincipal:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return decode_access_token(credentials.credentials)


def require_staff(
    current_user: Annotated[StaffPrincipal, Depends(require_authenticated)],
) -> StaffPrincipal:
    if current_user.role not in {"agent", "manager", "admin"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Staff role required for this operation",
        )
    return current_user


def require_admin(current_user: Annotated[StaffPrincipal, Depends(require_staff)]) -> StaffPrincipal:
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin role required for inventory and pricing administration",
        )
    return current_user
