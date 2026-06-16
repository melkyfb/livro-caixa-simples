from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os
import jwt # PyJWT
from jwt import PyJWKClient

# Cognito Configuration
REGION = os.getenv("REGION", "us-east-1")
USER_POOL_ID = os.getenv("USER_POOL_ID")
JWKS_URL = f"https://cognito-idp.{REGION}.amazonaws.com/{USER_POOL_ID}/.well-known/jwks.json"

security = HTTPBearer()
jwks_client = PyJWKClient(JWKS_URL)

async def get_current_user(token: HTTPAuthorizationCredentials = Depends(security)):
    try:
        signing_key = jwks_client.get_signing_key_from_jwt(token.credentials)
        data = jwt.decode(
            token.credentials,
            signing_key.key,
            algorithms=["RS256"],
            audience=os.getenv("USER_POOL_CLIENT_ID"),
            issuer=f"https://cognito-idp.{REGION}.amazonaws.com/{USER_POOL_ID}"
        )
        # The 'sub' claim is the unique user ID in Cognito
        return data["sub"]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication credentials: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )
