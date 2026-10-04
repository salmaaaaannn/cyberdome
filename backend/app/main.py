from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager

from app.core.config import settings
from app.seed import init_db, seed_data
from app.routers import auth, companies, admin, assets, notifications
from app.routers import website_security, attack_surface, scanner, vulnerability, ai
from app.routers import incidents, network, iot, ueba, soar, reports, attack_graph, digital_twin, agents, sensors, personal, browser, simulations
from app.routers import ws, detections, fusion

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize schema and seed demo data on application startup
    await init_db()
    await seed_data()
    yield

app = FastAPI(
    title=f"{settings.PROJECT_NAME} Backend",
    version=settings.VERSION,
    description="High-security FastAPI backend with multi-tenant company isolation, RBAC, and independent personal protection.",
    lifespan=lifespan
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Standardized Exception Handlers for uniform JSON response format
@app.exception_handler(HTTPException)
async def custom_http_exception_handler(request: Request, exc: HTTPException):
    detail = exc.detail
    if isinstance(detail, dict):
        error_dict = {
            "code": detail.get("code", "HTTP_ERROR"),
            "message": detail.get("message", "Error occurred")
        }
        for k, v in detail.items():
            if k not in ["code", "message"]:
                error_dict[k] = v
    else:
        error_dict = {
            "code": "HTTP_ERROR",
            "message": str(detail)
        }

    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "data": None,
            "error": error_dict
        }
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    first_error = errors[0] if errors else {}
    msg = first_error.get("msg", "Validation error occurred")
    loc = ".".join(str(l) for l in first_error.get("loc", []))
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "data": None,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": f"{loc}: {msg}",
                "details": [{k: v for k, v in err.items() if k != 'ctx'} for err in errors]
            }
        }
    )

# Routers under /api/v1
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(companies.router, prefix=settings.API_V1_STR)
app.include_router(admin.router, prefix=settings.API_V1_STR)
app.include_router(assets.router, prefix=settings.API_V1_STR)
app.include_router(notifications.router, prefix=settings.API_V1_STR)

# Phase 2: Website Security, Attack Surface, Scanner, Vulnerability Intelligence
app.include_router(website_security.router, prefix=settings.API_V1_STR)
app.include_router(attack_surface.router, prefix=settings.API_V1_STR)
app.include_router(scanner.router, prefix=settings.API_V1_STR)
app.include_router(vulnerability.router, prefix=settings.API_V1_STR)
app.include_router(ai.router, prefix=settings.API_V1_STR)

# Enterprise SOC, Threat Intelligence & Digital Twin Routers
app.include_router(incidents.router, prefix=settings.API_V1_STR)
app.include_router(network.router, prefix=settings.API_V1_STR)
app.include_router(iot.router, prefix=settings.API_V1_STR)
app.include_router(ueba.router, prefix=settings.API_V1_STR)
app.include_router(soar.router, prefix=settings.API_V1_STR)
app.include_router(reports.router, prefix=settings.API_V1_STR)
app.include_router(attack_graph.router, prefix=settings.API_V1_STR)
app.include_router(digital_twin.router, prefix=settings.API_V1_STR)
app.include_router(agents.router, prefix=settings.API_V1_STR)
app.include_router(sensors.router, prefix=settings.API_V1_STR)
app.include_router(personal.router, prefix=settings.API_V1_STR)
app.include_router(browser.router, prefix=settings.API_V1_STR)
app.include_router(browser.url_router, prefix=settings.API_V1_STR)
app.include_router(detections.router, prefix=settings.API_V1_STR)
app.include_router(detections.detections_router, prefix=settings.API_V1_STR)
app.include_router(ws.router, prefix=settings.API_V1_STR)
app.include_router(simulations.router, prefix=settings.API_V1_STR)
app.include_router(fusion.router, prefix=settings.API_V1_STR)
app.include_router(ws.router) # Root /ws mount for direct websocket clients

@app.get("/health", tags=["Health"])
@app.get(f"{settings.API_V1_STR}/health", tags=["Health"])
async def health_check():
    return {
        "success": True,
        "data": {
            "status": "healthy",
            "service": settings.PROJECT_NAME,
            "version": settings.VERSION,
            "environment": settings.ENVIRONMENT
        },
        "error": None
    }
