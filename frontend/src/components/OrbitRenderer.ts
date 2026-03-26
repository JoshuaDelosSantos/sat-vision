import {
  Viewer,
  Cartesian3,
  Color,
  JulianDate,
  SampledPositionProperty,
  ClockRange,
  ClockStep,
  PolylineGlowMaterialProperty,
  CallbackProperty,
  Entity,
} from "cesium";
import type { OrbitData } from "../services/api";

let orbitEntity: Entity | undefined;
let satelliteEntity: Entity | undefined;

/**
 * Draw / update the orbit polyline and satellite point on the viewer.
 * Manages its own entities — call repeatedly to refresh data.
 */
export function renderOrbit(viewer: Viewer, data: OrbitData) {
  // Remove previous entities
  if (orbitEntity) viewer.entities.remove(orbitEntity);
  if (satelliteEntity) viewer.entities.remove(satelliteEntity);

  const positions = data.positions;
  if (positions.length === 0) return;

  // Build SampledPositionProperty for animated satellite
  const positionProperty = new SampledPositionProperty();
  const cartesianArray: Cartesian3[] = [];

  for (const p of positions) {
    const jd = JulianDate.fromDate(new Date(p.epoch_ms));
    const cart = Cartesian3.fromDegrees(p.lon_deg, p.lat_deg, p.alt_km * 1000);
    positionProperty.addSample(jd, cart);
    cartesianArray.push(cart);
  }

  // Static polyline for the full orbit arc
  orbitEntity = viewer.entities.add({
    polyline: {
      positions: cartesianArray,
      width: 2,
      material: new PolylineGlowMaterialProperty({
        glowPower: 0.2,
        color: Color.CYAN,
      }),
    },
  });

  // Animated satellite point
  satelliteEntity = viewer.entities.add({
    position: positionProperty,
    point: {
      pixelSize: 10,
      color: Color.YELLOW,
      outlineColor: Color.WHITE,
      outlineWidth: 2,
    },
    label: {
      text: data.name,
      font: "12px sans-serif",
      fillColor: Color.WHITE,
      pixelOffset: { x: 12, y: -12 } as any,
    },
  });

  // Set the Cesium clock to span the orbit window
  const startTime = JulianDate.fromDate(new Date(positions[0].epoch_ms));
  const stopTime = JulianDate.fromDate(
    new Date(positions[positions.length - 1].epoch_ms),
  );

  viewer.clock.startTime = startTime.clone();
  viewer.clock.stopTime = stopTime.clone();
  viewer.clock.currentTime = startTime.clone();
  viewer.clock.clockRange = ClockRange.LOOP_STOP;
  viewer.clock.clockStep = ClockStep.SYSTEM_CLOCK_MULTIPLIER;
  viewer.clock.multiplier = 60; // 60x real-time

  if (viewer.timeline) {
    viewer.timeline.zoomTo(startTime, stopTime);
  }

  // Fly camera to mid-point of orbit
  const mid = positions[Math.floor(positions.length / 2)];
  viewer.camera.flyTo({
    destination: Cartesian3.fromDegrees(mid.lon_deg, mid.lat_deg, mid.alt_km * 1000 + 5_000_000),
    duration: 2,
  });
}

/** Remove orbit entities from the viewer. */
export function clearOrbit(viewer: Viewer) {
  if (orbitEntity) {
    viewer.entities.remove(orbitEntity);
    orbitEntity = undefined;
  }
  if (satelliteEntity) {
    viewer.entities.remove(satelliteEntity);
    satelliteEntity = undefined;
  }
}
