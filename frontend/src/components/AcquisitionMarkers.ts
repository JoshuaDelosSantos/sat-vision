/** Renders "!" markers on the globe at each Sentinel-2 acquisition position. */

import {
  Viewer,
  Cartesian3,
  Color,
  VerticalOrigin,
  HorizontalOrigin,
  LabelStyle,
  Entity,
  Cartesian2,
} from "cesium";
import type { Acquisition } from "../services/api";

const markerEntities: Entity[] = [];

/**
 * Render "!" billboard markers at each acquisition's satellite position.
 * Each entity stores the full Acquisition object under entity.properties.
 */
export function renderAcquisitionMarkers(
  viewer: Viewer,
  acquisitions: Acquisition[],
) {
  clearAcquisitionMarkers(viewer);

  for (const acq of acquisitions) {
    const entity = viewer.entities.add({
      position: Cartesian3.fromDegrees(
        acq.lon_deg,
        acq.lat_deg,
      ),
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
      description: `
        <table>
          <tr><td><b>Item</b></td><td>${acq.item_id}</td></tr>
          <tr><td><b>Date</b></td><td>${acq.datetime}</td></tr>
          <tr><td><b>Cloud cover</b></td><td>${acq.cloud_cover_pct != null ? acq.cloud_cover_pct + "%" : "N/A"}</td></tr>
          <tr><td><b>Position</b></td><td>${acq.lat_deg.toFixed(2)}°, ${acq.lon_deg.toFixed(2)}°</td></tr>
        </table>
      `,
    });
    markerEntities.push(entity);
  }
}

/** Remove all acquisition marker entities. */
export function clearAcquisitionMarkers(viewer: Viewer) {
  for (const entity of markerEntities) {
    viewer.entities.remove(entity);
  }
  markerEntities.length = 0;
}
