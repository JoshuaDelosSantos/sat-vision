"""Imagery API — returns Sentinel-2 acquisition index with satellite positions and tile URLs."""

from datetime import datetime, timedelta, timezone

import pystac_client
import planetary_computer
from fastapi import APIRouter, HTTPException, Query

from app.config import REGION_BBOX, STAC_API_URL, STAC_COLLECTION
from app.models.schemas import Acquisition, AcquisitionsResponse, TileURLResponse
from app.services.stac import fetch_acquisitions

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
        # Use the image footprint bbox centre for position (ground truth).
        # SGP4 propagation drifts too far from TLE epoch over a 30-day window.
        bbox = item.get("bbox")
        if not bbox or len(bbox) < 4:
            continue
        centre_lon = (bbox[0] + bbox[2]) / 2
        centre_lat = (bbox[1] + bbox[3]) / 2

        acquisitions.append(Acquisition(
            item_id=item["item_id"],
            datetime=item["datetime"],
            lat_deg=centre_lat,
            lon_deg=centre_lon,
            alt_km=0.0,
            cloud_cover_pct=item.get("cloud_cover_pct"),
            thumbnail_url=item.get("thumbnail_url"),
            footprint=item.get("footprint"),
            bbox=bbox,
        ))

    return AcquisitionsResponse(count=len(acquisitions), acquisitions=acquisitions)


@router.get("/imagery/{item_id}/tile-url", response_model=TileURLResponse)
def get_tile_url(item_id: str):
    """Return a signed XYZ tile URL for a given STAC item."""
    catalog = pystac_client.Client.open(
        STAC_API_URL,
        modifier=planetary_computer.sign_inplace,
    )

    try:
        item = catalog.get_collection(STAC_COLLECTION).get_item(item_id)
    except Exception:
        item = None

    if item is None:
        raise HTTPException(status_code=404, detail=f"Item {item_id} not found")

    # Planetary Computer provides a rendered tile endpoint via the 'tilejson' asset
    # or we can construct it from the 'visual' / 'rendered_preview' assets.
    # The simplest approach: use the item's tilejson rendering endpoint.
    tile_url = (
        f"https://planetarycomputer.microsoft.com/api/data/v1/"
        f"item/tiles/WebMercatorQuad/{{z}}/{{x}}/{{y}}@1x"
        f"?collection={STAC_COLLECTION}&item={item_id}"
        f"&assets=visual&format=png"
    )

    bbox = list(item.bbox) if item.bbox else []

    return TileURLResponse(
        item_id=item_id,
        tile_url_template=tile_url,
        bbox=bbox,
    )
