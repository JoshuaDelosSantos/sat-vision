import { useEffect, useRef } from "react";
import { Viewer, Ion, OpenStreetMapImageryProvider } from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";

// Suppress Ion token warning — we use free OSM tiles
Ion.defaultAccessToken = "";

export default function Globe() {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);

  useEffect(() => {
    if (!containerRef.current || viewerRef.current) return;

    const viewer = new Viewer(containerRef.current, {
      timeline: true,
      animation: true,
      homeButton: false,
      baseLayerPicker: false,
      navigationHelpButton: false,
      sceneModePicker: false,
      geocoder: false,
      baseLayer: false,
    });

    viewerRef.current = viewer;

    // Add free OSM tiles
    viewer.imageryLayers.addImageryProvider(
      new OpenStreetMapImageryProvider({
        url: "https://tile.openstreetmap.org/",
      }),
    );

    return () => {
      if (!viewer.isDestroyed()) {
        viewer.destroy();
      }
      viewerRef.current = null;
    };
  }, []);

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}
