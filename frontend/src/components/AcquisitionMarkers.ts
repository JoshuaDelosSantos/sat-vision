/** Renders acquisition markers, pass-track polylines, and an animated satellite on the Cesium viewer. */

import {
  Viewer,
  Cartesian3,
  Color,
  VerticalOrigin,
  HorizontalOrigin,
  LabelStyle,
  Entity,
  Cartesian2,
  JulianDate,
  SampledPositionProperty,
  ClockRange,
  ClockStep,
  PolylineDashMaterialProperty,
  PolylineGlowMaterialProperty,
} from "cesium";
import type { Acquisition } from "../services/api";

const markerEntities: Entity[] = [];
const trackEntities: Entity[] = [];
let satelliteEntity: Entity | undefined;

/** Pastel colours for distinguishing passes. */
const PASS_COLOURS = [
  Color.CYAN,
  Color.LIME,
  Color.ORANGE,
  Color.MAGENTA,
];

interface Pass {
  key: string;
  acquisitions: Acquisition[];
}

/** Group acquisitions into passes (same datetime minute = same pass). */
function groupByPass(acquisitions: Acquisition[]): Pass[] {
  const map = new Map<string, Acquisition[]>();
  for (const acq of acquisitions) {
    const key = acq.datetime.slice(0, 16); // YYYY-MM-DDTHH:MM
    let list = map.get(key);
    if (!list) {
      list = [];
      map.set(key, list);
    }
    list.push(acq);
  }

  // Sort passes newest first; within each pass, sort by latitude descending (N→S descending node)
  const passes: Pass[] = [];
  for (const [key, acqs] of map) {
    acqs.sort((a, b) => b.lat_deg - a.lat_deg);
    passes.push({ key, acquisitions: acqs });
  }
  passes.sort((a, b) => b.key.localeCompare(a.key));
  return passes;
}

/**
 * Render markers + pass-track polylines + animated satellite.
 * Each entity stores the full Acquisition object under entity.properties.
 */
export function renderAcquisitionMarkers(
  viewer: Viewer,
  acquisitions: Acquisition[],
) {
  clearAcquisitionMarkers(viewer);

  const passes = groupByPass(acquisitions);

  // ── Draw pass-track polylines ──
  passes.forEach((pass, i) => {
    const colour = PASS_COLOURS[i % PASS_COLOURS.length];

    // Deduplicate positions (multiple images share same centre)
    const seen = new Set<string>();
    const uniqueAcqs: Acquisition[] = [];
    for (const a of pass.acquisitions) {
      const k = `${a.lat_deg.toFixed(4)},${a.lon_deg.toFixed(4)}`;
      if (!seen.has(k)) {
        seen.add(k);
        uniqueAcqs.push(a);
      }
    }

    if (uniqueAcqs.length >= 2) {
      const trackPositions = uniqueAcqs.map((a) =>
        Cartesian3.fromDegrees(a.lon_deg, a.lat_deg),
      );

      trackEntities.push(
        viewer.entities.add({
          polyline: {
            positions: trackPositions,
            width: 3,
            material: new PolylineGlowMaterialProperty({
              glowPower: 0.15,
              color: colour.withAlpha(0.7),
            }),
            clampToGround: true,
          },
        }),
      );
    }
  });

  // ── Draw markers ──
  for (const acq of acquisitions) {
    const entity = viewer.entities.add({
      position: Cartesian3.fromDegrees(acq.lon_deg, acq.lat_deg),
      label: {
        text: "!",
        font: "bold 18px sans-serif",
        fillColor: Color.WHITE,
        outlineColor: Color.RED,
        outlineWidth: 2,
        style: LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: VerticalOrigin.CENTER,
        horizontalOrigin: HorizontalOrigin.CENTER,
        pixelOffset: new Cartesian2(0, 0),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        scale: 1.0,
      },
      point: {
        pixelSize: 8,
        color: Color.RED,
        outlineColor: Color.WHITE,
        outlineWidth: 1,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
      properties: {
        acquisitionData: acq,
      } as any,
    });
    markerEntities.push(entity);
  }

  // ── Animated satellite on the most recent pass ──
  if (passes.length > 0) {
    const latest = passes[0];
    // Deduplicate
    const seen = new Set<string>();
    const unique: Acquisition[] = [];
    for (const a of latest.acquisitions) {
      const k = `${a.lat_deg.toFixed(4)},${a.lon_deg.toFixed(4)}`;
      if (!seen.has(k)) {
        seen.add(k);
        unique.push(a);
      }
    }

    if (unique.length >= 2) {
      const positionProperty = new SampledPositionProperty();
      // Create synthetic timestamps (evenly spaced over 2 minutes for smooth animation)
      const baseTime = JulianDate.fromIso8601(latest.acquisitions[0].datetime);
      const dt = 120 / (unique.length - 1); // seconds between samples

      for (let i = 0; i < unique.length; i++) {
        const t = JulianDate.addSeconds(baseTime, i * dt, new JulianDate());
        const cart = Cartesian3.fromDegrees(unique[i].lon_deg, unique[i].lat_deg, 0);
        positionProperty.addSample(t, cart);
      }

      const startTime = baseTime;
      const stopTime = JulianDate.addSeconds(baseTime, 120, new JulianDate());

      satelliteEntity = viewer.entities.add({
        position: positionProperty,
        point: {
          pixelSize: 12,
          color: Color.YELLOW,
          outlineColor: Color.WHITE,
          outlineWidth: 2,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        label: {
          text: "Sentinel-2A",
          font: "12px sans-serif",
          fillColor: Color.WHITE,
          pixelOffset: new Cartesian2(14, -14),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      });

      // Set clock to animate along the pass
      viewer.clock.startTime = startTime.clone();
      viewer.clock.stopTime = stopTime.clone();
      viewer.clock.currentTime = startTime.clone();
      viewer.clock.clockRange = ClockRange.LOOP_STOP;
      viewer.clock.clockStep = ClockStep.SYSTEM_CLOCK_MULTIPLIER;
      viewer.clock.multiplier = 10;

      if (viewer.timeline) {
        viewer.timeline.zoomTo(startTime, stopTime);
      }
    }
  }

  // ── Fly camera to the acquisition area ──
  if (acquisitions.length > 0) {
    const lats = acquisitions.map((a) => a.lat_deg);
    const lons = acquisitions.map((a) => a.lon_deg);
    const centLat = (Math.min(...lats) + Math.max(...lats)) / 2;
    const centLon = (Math.min(...lons) + Math.max(...lons)) / 2;
    viewer.camera.flyTo({
      destination: Cartesian3.fromDegrees(centLon, centLat, 2_500_000),
      duration: 2,
    });
  }
}

/** Remove all acquisition marker and track entities. */
export function clearAcquisitionMarkers(viewer: Viewer) {
  for (const entity of markerEntities) viewer.entities.remove(entity);
  markerEntities.length = 0;

  for (const entity of trackEntities) viewer.entities.remove(entity);
  trackEntities.length = 0;

  if (satelliteEntity) {
    viewer.entities.remove(satelliteEntity);
    satelliteEntity = undefined;
  }
}
