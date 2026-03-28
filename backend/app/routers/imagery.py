"""Imagery API — returns Sentinel-2 acquisition index with satellite positions."""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Query

from app.config import REGION_BBOX
from app.models.schemas import Acquisition, AcquisitionsResponse
from app.services.stac import fetch_acquisitions
from app.services.propagator import propagate_at

router = APIRouter(prefix="/api")


@router.get("/acquisitions", response_model=AcquisitionsResponse)
def get_acquisitions(
    start: str | None = Query(None, description="ISO-8601 start date. Defaults to 30 days ago."),
    end: str | None = Query(None, description="ISO-8601 end date. Defaults to today."),
    max_items: int = Query(200, ge=1, le=500),
):
    now = datetime.now(timezone.utc)
    end_date = end or now.strftime("%Y-%m-%d")
    start_date = start or (now - timedelta(days=30)).strftime("%Y-%m-%d")

    raw_items = fetch_acquisitions(start_date, end_date, REGION_BBOX, max_items)

    acquisitions = []
    for item in raw_items:
        # Propagate satellite position at acquisition time
        dt = datetime.fromisoformat(item["datetime"]).replace(tzinfo=timezone.utc)
        try:
            pos = propagate_at(dt)
        except (ValueError, Exception):
            # Skip items where propagation fails (TLE too far from epoch)
            continue

        acquisitions.append(Acquisition(
            item_id=item["item_id"],
            datetime=item["datetime"],
            lat_deg=pos["lat_deg"],
            lon_deg=pos["lon_deg"],
            alt_km=pos["alt_km"],
            cloud_cover_pct=item.get("cloud_cover_pct"),
            thumbnail_url=item.get("thumbnail_url"),
            footprint=item.get("footprint"),
            bbox=item.get("bbox"),
        ))

    return AcquisitionsResponse(count=len(acquisitions), acquisitions=acquisitions)
