"""Pydantic response models for orbit positions and acquisition metadata."""

from pydantic import BaseModel


class Position(BaseModel):
    epoch_ms: int
    lat_deg: float
    lon_deg: float
    alt_km: float


class OrbitResponse(BaseModel):
    norad_id: int
    name: str
    positions: list[Position]
    window_minutes: int
    step_seconds: int


class Acquisition(BaseModel):
    item_id: str
    datetime: str
    lat_deg: float
    lon_deg: float
    alt_km: float
    cloud_cover_pct: float | None = None
    thumbnail_url: str | None = None
    footprint: dict | None = None
    bbox: list[float] | None = None


class AcquisitionsResponse(BaseModel):
    count: int
    acquisitions: list[Acquisition]


class TileURLResponse(BaseModel):
    item_id: str
    tile_url_template: str
    bbox: list[float]
