from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers.orbit import router as orbit_router
from app.routers.imagery import router as imagery_router

app = FastAPI(title="Sat-Vision API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

app.include_router(orbit_router)
app.include_router(imagery_router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
