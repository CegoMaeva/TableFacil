import os
import uvicorn
import jwt
from fastapi import FastAPI, Request, Response
import httpx
from starlette.responses import JSONResponse

# API Gateway that proxies to downstream services and validates JWT (except public paths).
app = FastAPI(title="TableFacil API Gateway", version="0.2.0")

AUTH_SERVICE_URL = os.getenv("AUTH_SERVICE_URL", "http://auth:8000")
ORDERS_SERVICE_URL = os.getenv("ORDERS_SERVICE_URL", "http://orders:8001")
INVENTORY_SERVICE_URL = os.getenv("INVENTORY_SERVICE_URL", "http://inventory:8002")
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-secret")
JWT_ALGO = "HS256"
PUBLIC_PATH_PREFIXES = ["/health", "/auth"]


@app.get("/health")
async def health():
    return {"status": "ok", "service": "gateway"}


def _is_public(path: str) -> bool:
    return any(path.startswith(prefix) for prefix in PUBLIC_PATH_PREFIXES)


@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    if _is_public(request.url.path):
        return await call_next(request)

    auth_header = request.headers.get("authorization")
    if not auth_header or not auth_header.lower().startswith("bearer "):
        return JSONResponse(status_code=401, content={"detail": "Missing Bearer token"})

    token = auth_header.split(" ", 1)[1]
    try:
        claims = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGO])
        request.state.user = claims
    except jwt.PyJWTError:
        return JSONResponse(status_code=401, content={"detail": "Invalid or expired token"})

    return await call_next(request)


async def _forward(request: Request, target_base: str):
    # Build target URL by preserving path and query.
    target_url = f"{target_base}{request.url.path}?{request.url.query}" if request.url.query else f"{target_base}{request.url.path}"
    # Prepare body if any.
    body = await request.body()
    headers = dict(request.headers)
    # Remove host to avoid conflicts.
    headers.pop("host", None)
    async with httpx.AsyncClient() as client:
        upstream_response = await client.request(
            request.method,
            target_url,
            content=body,
            headers=headers,
            timeout=15.0,
        )
    return Response(
        content=upstream_response.content,
        status_code=upstream_response.status_code,
        headers=dict(upstream_response.headers),
        media_type=upstream_response.headers.get("content-type"),
    )


@app.api_route("/auth/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])
async def proxy_auth(path: str, request: Request):
    upstream = AUTH_SERVICE_URL.rstrip("/")
    response = await _forward(request, upstream)
    return response


@app.api_route("/orders/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])
async def proxy_orders(path: str, request: Request):
    upstream = ORDERS_SERVICE_URL.rstrip("/")
    response = await _forward(request, upstream)
    return response


@app.api_route("/inventory/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])
async def proxy_inventory(path: str, request: Request):
    upstream = INVENTORY_SERVICE_URL.rstrip("/")
    response = await _forward(request, upstream)
    return response


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PORT", 8080)), reload=True)
