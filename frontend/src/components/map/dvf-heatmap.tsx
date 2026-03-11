"use client";

import { useRef, useCallback, useEffect, useState } from "react";
import Map, {
  Source,
  Layer,
  Popup,
  NavigationControl,
  GeolocateControl,
  ScaleControl,
} from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { useTheme } from "next-themes";
import type { MapPoint } from "@/hooks/use-dvf";
import type { MapRef } from "react-map-gl/maplibre";
import type { GeoJSON } from "geojson";

const INITIAL_VIEW = {
  longitude: -1.0,
  latitude: 43.5,
  zoom: 8,
};

const TILE_LIGHT =
  "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
const TILE_DARK =
  "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

function pointsToGeoJSON(points: MapPoint[]): GeoJSON {
  return {
    type: "FeatureCollection",
    features: points.map((p) => ({
      type: "Feature" as const,
      geometry: {
        type: "Point" as const,
        coordinates: [p.longitude, p.latitude],
      },
      properties: {
        valeur_fonciere: p.valeur_fonciere,
        nom_commune: p.nom_commune,
        surface_terrain: p.surface_terrain,
        prix_m2_terrain: p.surface_terrain && p.surface_terrain > 0
          ? Math.round(p.valeur_fonciere / p.surface_terrain)
          : null,
        date_mutation: p.date_mutation,
        nature_culture: p.nature_culture,
      },
    })),
  };
}

function formatPrice(n: number | null): string {
  if (n == null) return "—";
  return n.toLocaleString("fr-FR") + " €";
}

interface PopupInfo {
  longitude: number;
  latitude: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  properties: Record<string, any>;
}

const INTERACTIVE_ZOOM = 12;

export function DvfHeatmap({ points }: { points: MapPoint[] }) {
  const { resolvedTheme } = useTheme();
  const mapRef = useRef<MapRef>(null);
  const [popupInfo, setPopupInfo] = useState<PopupInfo | null>(null);
  const [geojson, setGeojson] = useState<GeoJSON>(pointsToGeoJSON([]));
  const [cursor, setCursor] = useState<string>("grab");
  const tileUrl = resolvedTheme === "dark" ? TILE_DARK : TILE_LIGHT;

  useEffect(() => {
    setGeojson(pointsToGeoJSON(points));
  }, [points]);

  const onClick = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (event: any) => {
      const feature = event.features?.[0];
      if (!feature) {
        setPopupInfo(null);
        return;
      }
      const coords = feature.geometry.coordinates;
      setPopupInfo({
        longitude: coords[0],
        latitude: coords[1],
        properties: feature.properties,
      });
    },
    []
  );

  return (
    <div className="w-full h-[400px] lg:h-[500px] rounded-lg overflow-hidden border">
      <Map
        ref={mapRef}
        initialViewState={INITIAL_VIEW}
        style={{ width: "100%", height: "100%" }}
        mapStyle={tileUrl}
        interactiveLayerIds={["terrain-points"]}
        onClick={onClick}
        cursor={cursor}
        onMouseEnter={() => setCursor("pointer")}
        onMouseLeave={() => {
          const zoom = mapRef.current?.getZoom() ?? 0;
          setCursor(zoom >= INTERACTIVE_ZOOM ? "crosshair" : "grab");
        }}
        onZoomEnd={() => {
          const zoom = mapRef.current?.getZoom() ?? 0;
          setCursor(zoom >= INTERACTIVE_ZOOM ? "crosshair" : "grab");
        }}
      >
        <NavigationControl position="top-right" />
        <GeolocateControl position="top-right" />
        <ScaleControl position="bottom-left" />

        <Source id="terrain-data" type="geojson" data={geojson}>
          {/* Heatmap layer — visible at low zoom, fades at high zoom */}
          <Layer
            id="terrain-heat"
            type="heatmap"
            maxzoom={13}
            paint={{
              "heatmap-weight": [
                "interpolate",
                ["linear"],
                ["get", "valeur_fonciere"],
                0, 0,
                50000, 0.3,
                150000, 0.6,
                500000, 1,
              ],
              "heatmap-intensity": [
                "interpolate",
                ["linear"],
                ["zoom"],
                0, 1,
                13, 3,
              ],
              "heatmap-color": [
                "interpolate",
                ["linear"],
                ["heatmap-density"],
                0, "rgba(33,102,172,0)",
                0.2, "rgb(103,169,207)",
                0.4, "rgb(209,229,240)",
                0.6, "rgb(253,219,119)",
                0.8, "rgb(239,138,98)",
                1, "rgb(178,24,43)",
              ],
              "heatmap-radius": [
                "interpolate",
                ["linear"],
                ["zoom"],
                0, 2,
                8, 15,
                13, 25,
              ],
              "heatmap-opacity": [
                "interpolate",
                ["linear"],
                ["zoom"],
                11, 0.8,
                13, 0,
              ],
            }}
          />

          {/* Points — visible at high zoom */}
          <Layer
            id="terrain-points"
            type="circle"
            minzoom={10}
            paint={{
              "circle-radius": [
                "interpolate",
                ["linear"],
                ["zoom"],
                10, 3,
                15, 8,
              ],
              "circle-color": [
                "interpolate",
                ["linear"],
                ["get", "valeur_fonciere"],
                0, "#2166ac",
                50000, "#67a9cf",
                100000, "#d1e5f0",
                150000, "#fddb77",
                250000, "#ef8a62",
                500000, "#b2182b",
              ],
              "circle-stroke-width": 1,
              "circle-stroke-color": "#fff",
              "circle-opacity": [
                "interpolate",
                ["linear"],
                ["zoom"],
                10, 0,
                12, 0.8,
              ],
            }}
          />
        </Source>

        {popupInfo && (
          <Popup
            longitude={popupInfo.longitude}
            latitude={popupInfo.latitude}
            closeOnClick={false}
            onClose={() => setPopupInfo(null)}
            maxWidth="260px"
          >
            <div className="text-sm space-y-1 p-1">
              <p className="font-semibold">
                {popupInfo.properties.nature_culture
                  ? `${String(popupInfo.properties.nature_culture)} — `
                  : "Terrain — "}
                {String(popupInfo.properties.nom_commune)}
              </p>
              <p>Prix : {formatPrice(Number(popupInfo.properties.valeur_fonciere))}</p>
              {popupInfo.properties.surface_terrain > 0 && (
                <p>Surface : {Number(popupInfo.properties.surface_terrain).toLocaleString("fr-FR")} m²</p>
              )}
              {popupInfo.properties.prix_m2_terrain > 0 && (
                <p>Prix/m² : {formatPrice(Number(popupInfo.properties.prix_m2_terrain))}</p>
              )}
              <p className="text-muted-foreground">
                {String(popupInfo.properties.date_mutation)}
              </p>
            </div>
          </Popup>
        )}
      </Map>

      {/* Legend */}
      <div className="flex gap-3 mt-2 text-xs text-muted-foreground px-1 items-center">
        <span>Prix :</span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: "#2166ac" }} />
          &lt; 50k
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: "#67a9cf" }} />
          50k
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: "#fddb77" }} />
          150k
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: "#ef8a62" }} />
          250k
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: "#b2182b" }} />
          500k+
        </span>
      </div>
    </div>
  );
}
