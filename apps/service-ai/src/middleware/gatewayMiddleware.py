import os
from typing import Annotated
from fastapi import HTTPException, Header

GATEWAY_API_KEY = os.environ.get("GATEWAY_API_KEY")

async def verify_gateway_key(x_api_key: Annotated[str | None, Header()] = None):
    if not x_api_key or x_api_key != GATEWAY_API_KEY:
        raise HTTPException(status_code=403, detail="Direct access to this service is not allowed")

    return x_api_key
