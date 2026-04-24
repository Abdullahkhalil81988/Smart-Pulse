import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from api.routers.ml import router

app = FastAPI(title="SmartPulse API", version="0.2.0")

ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://frontend:3000",  # Docker service name
    os.environ.get("FRONTEND_URL", ""),
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o for o in ALLOWED_ORIGINS if o],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    debug = os.environ.get("APP_ENV", "production") == "development"
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "detail": str(exc) if debug else "Unexpected error — check server logs",
        },
    )

app.include_router(router)

@app.get("/health")
def health():
    return {"status": "ok", "version": "0.2.0"}