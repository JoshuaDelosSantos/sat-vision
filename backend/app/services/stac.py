"""STAC client — queries Planetary Computer for Sentinel-2 L2A acquisitions with caching."""

import time
import logging
from datetime import datetime

import pystac_client
import planetary_computer

from app.config import (
    STAC_API_URL,
    STAC_COLLECTION,
    STAC_CACHE_TTL_SECONDS,
    REGION_BBOX,
)

logger = logging.getLogger(__name__)

_cache: dict[str, tuple[float, list[dict]]] = {}


def fetch_acquisitions(
    start_date: str,
    end_date: str,
    bbox: list[float] | None = None,
    max_items: int = 200,
) -> list[dict]:
    """Query Planetary Computer STAC for Sentinel-2 L2A items.

    Args:
        start_date: ISO-8601 date string (e.g. "2026-02-26")
        end_date: ISO-8601 date string (e.g. "2026-03-28")
        bbox: [west, south, east, north] — defaults to REGION_BBOX
        max_items: cap on returned items

    Returns list of dicts with acquisition metadata.
    """
    bbox = bbox or REGION_BBOX
    cache_key = f"{start_date}_{end_date}_{bbox}"

    now = time.time()
    cached = _cache.get(cache_key)
    if cached and (now - cached[0]) < STAC_CACHE_TTL_SECONDS:
        return cached[1]

    catalog = pystac_client.Client.open(
        STAC_API_URL,
        modifier=planetary_computer.sign_inplace,
    )

    search = catalog.search(
        collections=[STAC_COLLECTION],
        bbox=bbox,
        datetime=f"{start_date}/{end_date}",
        max_items=max_items,
        sortby=[{"field": "datetime", "direction": "desc"}],
    )

    results = []
    for item in search.items():
        dt = item.datetime or item.properties.get("datetime")
        if dt is None:
            continue

        # Extract thumbnail URL
        thumbnail_url = None
        if "rendered_preview" in item.assets:
            thumbnail_url = item.assets["rendered_preview"].href
        elif "thumbnail" in item.assets:
            thumbnail_url = item.assets["thumbnail"].href

        # Extract footprint geometry
        footprint = item.geometry

        cloud_cover = item.properties.get("eo:cloud_cover")

        results.append({
            "item_id": item.id,
            "datetime": dt.isoformat() if isinstance(dt, datetime) else str(dt),
            "cloud_cover_pct": round(cloud_cover, 1) if cloud_cover is not None else None,
            "thumbnail_url": thumbnail_url,
            "footprint": footprint,
            "bbox": list(item.bbox) if item.bbox else None,
        })

    _cache[cache_key] = (now, results)
    logger.info("STAC query returned %d items for %s to %s", len(results), start_date, end_date)
    return results
