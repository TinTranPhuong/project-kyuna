import hashlib
import bcrypt
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError

from app.core.config import settings

def hash_password(plain_password: str) -> str:
    """Hash a password using bcrypt with SHA-256 pre-hashing (bypasses 72-byte limit safely)."""
    # 1. Pre-hash to 64 hex characters to ensure it always fits bcrypt's limits
    pre_hashed = hashlib.sha256(plain_password.encode('utf-8')).hexdigest().encode('utf-8')
    # 2. Generate salt and hash natively
    salt = bcrypt.gensalt()
    hashed_bytes = bcrypt.hashpw(pre_hashed, salt)
    return hashed_bytes.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Return True if plain_password matches the hash."""
    pre_hashed = hashlib.sha256(plain_password.encode('utf-8')).hexdigest().encode('utf-8')
    hash_bytes = hashed_password.encode('utf-8')
    return bcrypt.checkpw(pre_hashed, hash_bytes)

def create_access_token(data: dict) -> str:
    """Create a short-lived JWT access token. Expires in ACCESS_TOKEN_EXPIRE_MINUTES."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def create_refresh_token(data: dict) -> str:
    """Create a long-lived JWT refresh token. Expires in REFRESH_TOKEN_EXPIRE_DAYS."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def decode_token(token: str) -> dict | None:
    """Decode JWT. Returns payload dict or None if invalid/expired."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None