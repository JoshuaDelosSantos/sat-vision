import { useCallback, useRef, useState } from "react";
import Globe, { GlobeHandle } from "./components/Globe";
import ImagePanel from "./components/ImagePanel";
import {
  drapeImagery,
  toggleDrapedLayer,
  removeDrapedLayer,
  getDrapedLayers,
  DrapedLayer,
} from "./components/ImageryDraper";
import type { Acquisition, TileURLData } from "./services/api";

export default function App() {
  const globeRef = useRef<GlobeHandle>(null);
  const [selectedAcq, setSelectedAcq] = useState<Acquisition | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [drapedLayers, setDrapedLayers] = useState<DrapedLayer[]>([]);

  const handleMarkerClick = useCallback((acq: Acquisition) => {
    setSelectedAcq(acq);
    setPanelOpen(true);
  }, []);

  const handleDrape = useCallback(
    (itemId: string, tileData: TileURLData) => {
      const viewer = globeRef.current?.getViewer();
      if (!viewer || viewer.isDestroyed()) return;
      drapeImagery(viewer, itemId, tileData.tile_url_template, tileData.bbox);
      setDrapedLayers(getDrapedLayers());
    },
    [],
  );

  const handleToggle = useCallback(
    (itemId: string) => {
      toggleDrapedLayer(itemId);
      setDrapedLayers([...getDrapedLayers()]);
    },
    [],
  );

  const handleRemove = useCallback(
    (itemId: string) => {
      const viewer = globeRef.current?.getViewer();
      if (!viewer || viewer.isDestroyed()) return;
      removeDrapedLayer(viewer, itemId);
      setDrapedLayers(getDrapedLayers());
    },
    [],
  );

  const handleClose = useCallback(() => {
    setPanelOpen(false);
  }, []);

  return (
    <div style={{ display: "flex", width: "100%", height: "100%" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Globe ref={globeRef} onMarkerClick={handleMarkerClick} drapedCount={drapedLayers.length} />
      </div>
      {panelOpen && (
        <ImagePanel
          acquisition={selectedAcq}
          onDrape={handleDrape}
          onToggle={handleToggle}
          onRemove={handleRemove}
          onClose={handleClose}
          drapedLayers={drapedLayers}
        />
      )}
    </div>
  );
}
