"""
Auth0 JWT verification for SafeBites API

In development mode (AUTH0_DOMAIN not set), auth is bypassed.
In production, full JWT verification is enforced.
"""
import os
import logging
from typing import Optional
from functools import lru_cache

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError, ExpiredSignatureError

logger = logging.getLogger(__name__)

# Security scheme
security = HTTPBearer(auto_error=False)

# Auth0 configuration from environment
AUTH0_DOMAIN = os.getenv("AUTH0_DOMAIN", "")
AUTH0_API_AUDIENCE = os.getenv("AUTH0_API_AUDIENCE", "")
AUTH0_ALGORITHMS = ["RS256"]

# Development mode: skip auth when Auth0 is not configured
DEV_MODE = not AUTH0_DOMAIN or os.getenv("ENV", "development") == "development"

if DEV_MODE:
    logger.warning("⚠️  Running in DEV MODE - Auth verification is relaxed")


@lru_cache(maxsize=1)
def get_jwks() -> dict:
    """
    Fetch and cache JWKS (JSON Web Key Set) from Auth0.
    """
    if not AUTH0_DOMAIN:
        return {}
    
    jwks_url = f"https://{AUTH0_DOMAIN}/.well-known/jwks.json"
    try:
        response = httpx.get(jwks_url, timeout=10.0)
        response.raise_for_status()
        return response.json()
    except httpx.HTTPError as e:
        logger.error(f"Failed to fetch JWKS: {e}")
        return {}


def get_signing_key(token: str) -> Optional[dict]:
    """Get the signing key for a given token from JWKS."""
    jwks = get_jwks()
    if not jwks or "keys" not in jwks:
        return None
    
    try:
        unverified_header = jwt.get_unverified_header(token)
    except JWTError:
        return None
    
    kid = unverified_header.get("kid")
    if not kid:
        return None
    
    for key in jwks["keys"]:
        if key.get("kid") == kid:
            return key
    
    return None


def verify_token(token: str) -> dict:
    """
    Verify an Auth0 JWT token and return the payload.
    In dev mode with no Auth0 config, extracts claims without full verification.
    """
    # In dev mode, try to decode without verification for local testing
    if DEV_MODE and not AUTH0_DOMAIN:
        try:
            # Decode without verification - ONLY for development
            payload = jwt.get_unverified_claims(token)
            logger.debug(f"DEV MODE: Extracted claims without verification")
            return payload
        except JWTError:
            pass
    
    signing_key = get_signing_key(token)
    
    if not signing_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unable to find signing key",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    try:
        # In dev mode, skip audience verification if not configured
        decode_options = {}
        audience = AUTH0_API_AUDIENCE if AUTH0_API_AUDIENCE else None
        
        if DEV_MODE and not audience:
            decode_options["verify_aud"] = False
            audience = None
        
        payload = jwt.decode(
            token,
            signing_key,
            algorithms=AUTH0_ALGORITHMS,
            audience=audience,
            issuer=f"https://{AUTH0_DOMAIN}/",
            options=decode_options
        )
        return payload
    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except JWTError as e:
        logger.error(f"JWT verification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> str:
    """
    FastAPI dependency to get the current authenticated user ID.
    In dev mode without credentials, returns a test user ID.
    """
    # Dev mode fallback for testing without auth
    if DEV_MODE and not credentials:
        logger.debug("DEV MODE: No credentials, using test user")
        return "dev-test-user"
    
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header missing",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    payload = verify_token(credentials.credentials)
    user_id = payload.get("sub")
    
    if not user_id:
        if DEV_MODE:
            return "dev-test-user"
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing user ID",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user_id


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Optional[str]:
    """
    FastAPI dependency to optionally get the current user ID.
    Returns None if no token provided.
    """
    if not credentials:
        return None
    
    try:
        payload = verify_token(credentials.credentials)
        return payload.get("sub")
    except HTTPException:
        if DEV_MODE:
            return "dev-test-user"
        return None
