from datetime import datetime, timezone

from fastapi import APIRouter, Query

from app.config import DEFAULT_WINDOW_MINUTES, DEFAULT_STEP_SECONDS, NORAD_ID
from app.models.schemas import OrbitResponse, Position
from app.services.propagator import propagate_orbit

router = APIRouter(prefix="/api")


@router.get("/orbit", response_model=OrbitResponse)
def get_orbit(
    time: str | None = Query(None, description="ISO-8601 centre time (UTC). Defaults to now."),
    window_minutes: int = Query(DEFAULT_WINDOW_MINUTES, ge=10, le=300),
    step_seconds: int = Query(DEFAULT_STEP_SECONDS, ge=5, le=120),
):
    if time:
        center = datetime.fromisoformat(time).replace(tzinfo=timezone.utc)
    else:
        center = datetime.now(timezone.utc)

    raw = propagate_orbit(center, window_minutes, step_seconds)
    positions = [Position(**p) for p in raw]

    return OrbitResponse(
        norad_id=NORAD_ID,
        name="Sentinel-2A",
        positions=positions,
        window_minutes=window_minutes,
        step_seconds=step_seconds,
    )
