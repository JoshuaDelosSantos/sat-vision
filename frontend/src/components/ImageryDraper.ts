/** Manages draping/removing Sentinel-2 imagery layers on the Cesium viewer. */

import {
  Viewer,
  UrlTemplateImageryProvider,
  Rectangle,
  ImageryLayer,
} from "cesium";

export interface DrapedLayer {
  itemId: string;
  layer: ImageryLayer;
  visible: boolean;
}

const drapedLayers: Map<string, DrapedLayer> = new Map();

/** Drape a tile layer on the globe for the given item. Returns the DrapedLayer. */
export function drapeImagery(
  viewer: Viewer,
  itemId: string,
  tileUrlTemplate: string,
  bbox: number[],
): DrapedLayer {
  const rect = Rectangle.fromDegrees(bbox[0], bbox[1], bbox[2], bbox[3]);

  // Already draped — just make visible and fly to it
  const existing = drapedLayers.get(itemId);
  if (existing) {
    existing.layer.show = true;
    existing.visible = true;
    viewer.camera.flyTo({ destination: rect });
    return existing;
  }

  const provider = new UrlTemplateImageryProvider({
    url: tileUrlTemplate,
    rectangle: rect,
    minimumLevel: 0,
    maximumLevel: 24,
    credit: "Copernicus Sentinel-2 via Microsoft Planetary Computer",
  });

  const layer = viewer.imageryLayers.addImageryProvider(provider);

  // Fly the camera to the draped area so the user can see it
  viewer.camera.flyTo({ destination: rect });

  const draped: DrapedLayer = { itemId, layer, visible: true };
  drapedLayers.set(itemId, draped);
  return draped;
}

/** Toggle visibility of a draped layer. */
export function toggleDrapedLayer(itemId: string): boolean {
  const draped = drapedLayers.get(itemId);
  if (!draped) return false;
  draped.visible = !draped.visible;
  draped.layer.show = draped.visible;
  return draped.visible;
}

/** Remove a draped layer from the viewer. */
export function removeDrapedLayer(viewer: Viewer, itemId: string) {
  const draped = drapedLayers.get(itemId);
  if (!draped) return;
  viewer.imageryLayers.remove(draped.layer);
  drapedLayers.delete(itemId);
}

/** Remove all draped layers. */
export function clearAllDrapedLayers(viewer: Viewer) {
  for (const [, draped] of drapedLayers) {
    viewer.imageryLayers.remove(draped.layer);
  }
  drapedLayers.clear();
}

/** Get current list of draped layers. */
export function getDrapedLayers(): DrapedLayer[] {
  return Array.from(drapedLayers.values());
}
