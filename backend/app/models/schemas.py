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
