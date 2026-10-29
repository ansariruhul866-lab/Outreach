import os
import httpx
from fastapi import HTTPException, status
from typing import Dict, Any, Optional

# Try initializing firebase_admin if credentials or project are present
try:
    import firebase_admin
    from firebase_admin import auth as admin_auth, credentials

    if not firebase_admin._apps:
        cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        if cred_path and os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
        elif os.getenv("FIREBASE_PROJECT_ID"):
            firebase_admin.initialize_app(options={"projectId": os.getenv("FIREBASE_PROJECT_ID")})
        else:
            # Initialize default app if possible
            try:
                firebase_admin.initialize_app()
            except Exception:
                pass
except Exception:
    admin_auth = None

async def verify_firebase_id_token(id_token: str) -> Dict[str, Any]:
    """
    Verifies a Firebase ID token.
    Uses firebase_admin if initialized, otherwise validates against Google's official tokeninfo endpoint.
    Guarantees email verification is strictly enforced.
    """
    if not id_token or not id_token.strip():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Firebase ID token is required"
        )

    user_info = None

    # Method 1: Try firebase_admin if active
    if admin_auth and firebase_admin._apps:
        try:
            decoded = admin_auth.verify_id_token(id_token)
            user_info = {
                "uid": decoded.get("uid") or decoded.get("sub"),
                "email": decoded.get("email"),
                "name": decoded.get("name") or decoded.get("display_name"),
                "email_verified": bool(decoded.get("email_verified", False))
            }
        except Exception as e:
            # Fall back to tokeninfo check below
            pass

    # Method 2: Google tokeninfo verification (reliable & requires no server service-account key)
    if not user_info:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(
                    "https://oauth2.googleapis.com/tokeninfo",
                    params={"id_token": id_token}
                )
                if resp.status_code == 200:
                    data = resp.json()
                    email_verified_raw = data.get("email_verified")
                    is_verified = (email_verified_raw is True or email_verified_raw == "true")
                    user_info = {
                        "uid": data.get("sub") or data.get("user_id"),
                        "email": data.get("email"),
                        "name": data.get("name"),
                        "email_verified": is_verified
                    }
                else:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Invalid or expired Firebase ID token"
                    )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Failed to verify Firebase authentication: {str(e)}"
            )

    if not user_info or not user_info.get("email"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not retrieve authenticated user details"
        )

    # Strictly enforce email verification
    if not user_info.get("email_verified"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your email address has not been verified yet. Please check your inbox and click the verification link before logging in."
        )

    return user_info
