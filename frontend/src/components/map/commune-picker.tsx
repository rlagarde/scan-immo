"use client";

import { useRef, useCallback, useEffect, useState } from "react";
import Map, {
  Source,
  Layer,
  NavigationControl,
} from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { useTheme } from "next-themes";
import type { MapRef } from "react-map-gl/maplibre";
import type { GeoJSON } from "geojson";

const TILE_LIGHT =
  "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
const TILE_DARK =
  "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

const INITIAL_VIEW = {
  longitude: -0.8,
  latitude: 44.0,
  zoom: 7,
};

const GEO_URLS: Record<string, string> = {
  "33": "/data/geo/communes-33.geojson",
  "40": "/data/geo/communes-40.geojson",
  "64": "/data/geo/communes-64.geojson",
};

interface CommunePickerProps {
  selected: string[];
  onChange: (communes: string[]) => void;
  departements?: string[];
}

export function CommunePicker({
  selected,
  onChange,
  departements,
}: CommunePickerProps) {
  const { resolvedTheme } = useTheme();
  const mapRef = useRef<MapRef>(null);
  const [geojson, setGeojson] = useState<GeoJSON | null>(null);
  const [hoveredCommune, setHoveredCommune] = useState<string | null>(null);
  const tileUrl = resolvedTheme === "dark" ? TILE_DARK : TILE_LIGHT;

  // Load commune boundaries
  useEffect(() => {
    const depts = departements?.length ? departements : Object.keys(GEO_URLS);
    const urls = depts.filter((d) => GEO_URLS[d]).map((d) => GEO_URLS[d]);

    Promise.all(urls.map((u) => fetch(u).then((r) => r.json()))).then(
      (results) => {
        // Merge all features
        const merged: GeoJSON = {
          type: "FeatureCollection",
          features: results.flatMap((r: any) => r.features || []),
        };
        setGeojson(merged);
      }
    );
  }, [departements]);

  const onClick = useCallback(
    (event: any) => {
      const feature = event.features?.[0];
      if (!feature) return;
      const nom = feature.properties?.nom;
      if (!nom) return;

      if (selected.includes(nom)) {
        onChange(selected.filter((c) => c !== nom));
      } else {
        onChange([...selected, nom]);
      }
    },
    [selected, onChange]
  );

  const onHover = useCallback((event: any) => {
    const feature = event.features?.[0];
    setHoveredCommune(feature?.properties?.nom ?? null);
  }, []);

  const selectedSet = new Set(selected);
  const allSelected = selected.length === 0;

  // Build a filter expression for selected communes
  const selectedFilter = selected.length > 0
    ? ["in", ["get", "nom"], ["literal", selected]]
    : ["literal", false];
  const unselectedFilter = selected.length > 0
    ? ["!", ["in", ["get", "nom"], ["literal", selected]]]
    : ["literal", true];

  return (
    <div className="space-y-2">
      <div className="h-[250px] rounded-lg overflow-hidden border">
        <Map
          ref={mapRef}
          initialViewState={INITIAL_VIEW}
          style={{ width: "100%", height: "100%" }}
          mapStyle={tileUrl}
          fadeDuration={0}
          interactiveLayerIds={["communes-fill", "communes-fill-selected"]}
          onClick={onClick}
          onMouseMove={onHover}
          onMouseLeave={() => setHoveredCommune(null)}
          cursor="pointer"
        >
          <NavigationControl position="top-right" showCompass={false} />

          {geojson && (
            <Source id="communes" type="geojson" data={geojson}>
              {/* Unselected communes — subtle fill */}
              <Layer
                id="communes-fill"
                type="fill"
                filter={unselectedFilter as any}
                paint={{
                  "fill-color": resolvedTheme === "dark"
                    ? "rgba(255,255,255,0.05)"
                    : "rgba(0,0,0,0.03)",
                  "fill-opacity": [
                    "case",
                    ["==", ["get", "nom"], hoveredCommune ?? ""],
                    0.3,
                    allSelected ? 0.15 : 0.05,
                  ],
                }}
              />

              {/* Selected communes — amber highlight */}
              <Layer
                id="communes-fill-selected"
                type="fill"
                filter={selectedFilter as any}
                paint={{
                  "fill-color": "#f59e0b",
                  "fill-opacity": [
                    "case",
                    ["==", ["get", "nom"], hoveredCommune ?? ""],
                    0.5,
                    0.3,
                  ],
                }}
              />

              {/* Borders */}
              <Layer
                id="communes-border"
                type="line"
                paint={{
                  "line-color": resolvedTheme === "dark"
                    ? "rgba(255,255,255,0.2)"
                    : "rgba(0,0,0,0.15)",
                  "line-width": [
                    "case",
                    ["in", ["get", "nom"], ["literal", selected.length > 0 ? selected : [""]]],
                    1.5,
                    0.5,
                  ],
                }}
              />

              {/* Labels at zoom */}
              <Layer
                id="communes-labels"
                type="symbol"
                minzoom={9}
                layout={{
                  "text-field": ["get", "nom"],
                  "text-size": ["interpolate", ["linear"], ["zoom"], 9, 9, 12, 12],
                  "text-font": ["Noto Sans Regular"],
                  "text-max-width": 8,
                }}
                paint={{
                  "text-color": resolvedTheme === "dark" ? "#e5e5e5" : "#333",
                  "text-halo-color": resolvedTheme === "dark" ? "#1a1a1a" : "#fff",
                  "text-halo-width": 1,
                }}
              />
            </Source>
          )}
        </Map>
      </div>

      {/* Info bar */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>
          {hoveredCommune
            ? hoveredCommune
            : selected.length > 0
              ? `${selected.length} commune${selected.length > 1 ? "s" : ""} sélectionnée${selected.length > 1 ? "s" : ""}`
              : "Cliquer pour sélectionner une commune"}
        </span>
        {selected.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-primary hover:underline"
          >
            Tout réinitialiser
          </button>
        )}
      </div>
    </div>
  );
}
