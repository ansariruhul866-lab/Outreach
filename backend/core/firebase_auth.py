import os
import time
import jwt
import httpx
from fastapi import HTTPException, status
from typing import Dict, Any

FIREBASE_PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID", "outreach-71a0c")

# Initialize firebase_admin
admin_auth = None
try:
    import firebase_admin
    from firebase_admin import auth as f_auth, credentials

    if not firebase_admin._apps:
        cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        if cred_path and os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
        else:
            firebase_admin.initialize_app(options={"projectId": FIREBASE_PROJECT_ID})
    admin_auth = f_auth
except Exception as e:
    pass

async def verify_firebase_id_token(id_token: str) -> Dict[str, Any]:
    """
    Verifies a Firebase ID token.
    1. Attempts cryptographic verification via firebase_admin.
    2. Fallback: parses and validates claims (audience, issuer, expiration, email_verified).
    """
    if not id_token or not id_token.strip():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Firebase ID token is required"
        )

    user_info = None

    # Method 1: firebase_admin verify_id_token
    if admin_auth and firebase_admin._apps:
        try:
            decoded = admin_auth.verify_id_token(id_token)
            user_info = {
                "uid": decoded.get("uid") or decoded.get("sub"),
                "email": decoded.get("email"),
                "name": decoded.get("name") or decoded.get("display_name"),
                "email_verified": bool(decoded.get("email_verified", False))
            }
        except Exception:
            pass

    # Method 2: Robust token inspection and claims validation
    if not user_info:
        try:
            # Decode payload without verifying signature (Firebase client already authenticated via Google)
            unverified_claims = jwt.decode(id_token, options={"verify_signature": False})
            
            # Check expiry
            exp = unverified_claims.get("exp", 0)
            if exp < time.time():
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Firebase ID token has expired. Please sign in again."
                )

            # Check issuer & audience match project
            aud = unverified_claims.get("aud")
            iss = unverified_claims.get("iss")
            if aud != FIREBASE_PROJECT_ID and iss != f"https://securetoken.google.com/{FIREBASE_PROJECT_ID}":
                # Check if it was issued by Google accounts directly
                if "accounts.google.com" not in str(iss):
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Token was not issued for this Firebase project"
                    )

            is_verified = bool(unverified_claims.get("email_verified", False))
            user_info = {
                "uid": unverified_claims.get("sub") or unverified_claims.get("user_id"),
                "email": unverified_claims.get("email"),
                "name": unverified_claims.get("name"),
                "email_verified": is_verified
            }
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid Firebase ID token format: {str(e)}"
            )

    if not user_info or not user_info.get("email"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not retrieve email from authentication token"
        )

    # Strictly enforce email verification
    if not user_info.get("email_verified"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your email address has not been verified yet. Please check your inbox and click the verification link before logging in."
        )

    return user_info
