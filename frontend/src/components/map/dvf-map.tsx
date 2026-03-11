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
import type { MapPoint } from "@/hooks/use-dvf";
import type { MapRef } from "react-map-gl/maplibre";
import type { GeoJSON } from "geojson";

const INITIAL_VIEW = {
  longitude: -1.0,
  latitude: 43.5,
  zoom: 8,
};

const TILE_URL =
  "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

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
        id_mutation: p.id_mutation,
        valeur_fonciere: p.valeur_fonciere,
        prix_m2: p.prix_m2,
        type_local: p.type_local,
        nom_commune: p.nom_commune,
        surface_reelle_bati: p.surface_reelle_bati,
        surface_terrain: p.surface_terrain,
        nombre_pieces_principales: p.nombre_pieces_principales,
        date_mutation: p.date_mutation,
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

const PRICE_COLOR_STOPS: (string | number)[] = [
  0, "#2166ac",
  100000, "#67a9cf",
  200000, "#d1e5f0",
  300000, "#fddb77",
  400000, "#ef8a62",
  600000, "#b2182b",
];

export function DvfMap({ points }: { points: MapPoint[] }) {
  const mapRef = useRef<MapRef>(null);
  const [popupInfo, setPopupInfo] = useState<PopupInfo | null>(null);
  const [geojson, setGeojson] = useState<GeoJSON>(pointsToGeoJSON([]));
  const [cursor, setCursor] = useState<string>("grab");

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
        mapStyle={TILE_URL}
        interactiveLayerIds={["hab-maison-circles", "hab-appart-circles"]}
        onClick={onClick}
        cursor={cursor}
        onMouseEnter={() => setCursor("pointer")}
        onMouseLeave={() => {
          const zoom = mapRef.current?.getZoom() ?? 0;
          setCursor(zoom >= 12 ? "crosshair" : "grab");
        }}
        onZoomEnd={() => {
          const zoom = mapRef.current?.getZoom() ?? 0;
          setCursor(zoom >= 12 ? "crosshair" : "grab");
        }}
      >
        <NavigationControl position="top-right" />
        <GeolocateControl position="top-right" />
        <ScaleControl position="bottom-left" />

        <Source id="hab-data" type="geojson" data={geojson}>
          {/* Heatmap — visible at low zoom, fades out */}
          <Layer
            id="hab-heat"
            type="heatmap"
            maxzoom={14}
            paint={{
              "heatmap-weight": [
                "interpolate",
                ["linear"],
                ["get", "valeur_fonciere"],
                0, 0,
                100000, 0.3,
                300000, 0.6,
                600000, 1,
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
                14, 0,
              ],
            }}
          />

          {/* Maison — round circles */}
          <Layer
            id="hab-maison-circles"
            type="circle"
            minzoom={10}
            filter={["==", ["get", "type_local"], "Maison"]}
            paint={{
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 2, 14, 6, 18, 12],
              "circle-color": [
                "interpolate",
                ["linear"],
                ["get", "valeur_fonciere"],
                ...PRICE_COLOR_STOPS,
              ],
              "circle-stroke-width": 1,
              "circle-stroke-color": "#fff",
              "circle-opacity": [
                "interpolate",
                ["linear"],
                ["zoom"],
                10, 0,
                12, 0.85,
              ],
              "circle-stroke-opacity": [
                "interpolate",
                ["linear"],
                ["zoom"],
                10, 0,
                12, 0.85,
              ],
            }}
          />

          {/* Appartement — smaller circles with thicker dark stroke */}
          <Layer
            id="hab-appart-circles"
            type="circle"
            minzoom={10}
            filter={["==", ["get", "type_local"], "Appartement"]}
            paint={{
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 2, 14, 5, 18, 10],
              "circle-color": [
                "interpolate",
                ["linear"],
                ["get", "valeur_fonciere"],
                ...PRICE_COLOR_STOPS,
              ],
              "circle-stroke-width": 2,
              "circle-stroke-color": "#333",
              "circle-opacity": [
                "interpolate",
                ["linear"],
                ["zoom"],
                10, 0,
                12, 0.85,
              ],
              "circle-stroke-opacity": [
                "interpolate",
                ["linear"],
                ["zoom"],
                10, 0,
                12, 0.85,
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
            maxWidth="280px"
          >
            <div className="text-sm space-y-1 p-1">
              <p className="font-semibold">
                {String(popupInfo.properties.type_local)} —{" "}
                {String(popupInfo.properties.nom_commune)}
              </p>
              <p>Prix : {formatPrice(Number(popupInfo.properties.valeur_fonciere))}</p>
              {Number(popupInfo.properties.prix_m2) > 0 && (
                <p>Prix/m² : {formatPrice(Number(popupInfo.properties.prix_m2))}</p>
              )}
              {Number(popupInfo.properties.surface_reelle_bati) > 0 && (
                <p>Surface : {Number(popupInfo.properties.surface_reelle_bati).toLocaleString("fr-FR")} m²</p>
              )}
              {Number(popupInfo.properties.nombre_pieces_principales) > 0 && (
                <p>Pièces : {String(popupInfo.properties.nombre_pieces_principales)}</p>
              )}
              <p className="text-muted-foreground">
                {String(popupInfo.properties.date_mutation)}
              </p>
            </div>
          </Popup>
        )}
      </Map>

      {/* Legend */}
      <div className="flex gap-3 mt-2 text-xs text-muted-foreground px-1 items-center flex-wrap">
        <span>Prix :</span>
        {[
          { color: "#2166ac", label: "< 100k" },
          { color: "#67a9cf", label: "100k" },
          { color: "#d1e5f0", label: "200k" },
          { color: "#fddb77", label: "300k" },
          { color: "#ef8a62", label: "400k" },
          { color: "#b2182b", label: "600k+" },
        ].map((s) => (
          <span key={s.label} className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
            {s.label}
          </span>
        ))}
        <span className="ml-2 border-l pl-2 flex items-center gap-2">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full border border-muted-foreground bg-muted" />
            Maison
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full border-2 border-gray-700 bg-muted" />
            Appart.
          </span>
        </span>
      </div>
    </div>
  );
}
