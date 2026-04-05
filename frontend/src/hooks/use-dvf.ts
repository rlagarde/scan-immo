"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { queryDvf, loadParquet } from "@/lib/duckdb";

export interface Filters {
  departements: string[];
  typesLocal: string[];
  anneeMin: number;
  anneeMax: number;
  communes: string[];
  pieces: number[];
  surfaceTerrainMax: number | null;
  natureCultures: string[];
  venteSimple: boolean;
}

export const DEFAULT_FILTERS: Filters = {
  departements: [],
  typesLocal: [],
  anneeMin: 2020,
  anneeMax: 2025,
  communes: [],
  pieces: [],
  surfaceTerrainMax: null,
  natureCultures: [],
  venteSimple: true,
};

function sqlList(values: string[]): string {
  return values.map((v) => `'${v.replace(/'/g, "''")}'`).join(", ");
}

function buildWhereClause(filters: Filters): string {
  const conditions: string[] = [];
  if (filters.departements.length > 0) {
    conditions.push(`code_departement IN (${sqlList(filters.departements)})`);
  }
  if (filters.typesLocal.length > 0) {
    conditions.push(`type_local IN (${sqlList(filters.typesLocal)})`);
  }
  if (filters.communes.length > 0) {
    conditions.push(`nom_commune IN (${sqlList(filters.communes)})`);
  }
  if (filters.pieces.length > 0) {
    conditions.push(`nombre_pieces_principales IN (${filters.pieces.join(", ")})`);
  }
  if (filters.surfaceTerrainMax != null) {
    conditions.push(`surface_terrain <= ${filters.surfaceTerrainMax}`);
  }
  if (filters.natureCultures.length > 0) {
    conditions.push(`nature_culture IN (${sqlList(filters.natureCultures)})`);
  }
  if (filters.venteSimple) {
    conditions.push(`(vente_multiple = false OR vente_multiple IS NULL)`);
  }
  conditions.push(`annee >= ${filters.anneeMin}`);
  conditions.push(`annee <= ${filters.anneeMax}`);
  return conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";
}

export interface KpiData {
  totalTransactions: number;
  prixMedian: number;
  prixM2Median: number;
  surfaceMediane: number;
  piecesMoyen: number;
  surfaceBatiMoyenne: number;
  surfaceTerrainMoyenne: number;
}

export interface TimeSeriesPoint {
  annee: number;
  nb_transactions: number;
  prix_median: number;
  prix_m2_median: number;
}

export interface TimeSeriesByType {
  annee: number;
  type_local: string;
  nb_transactions: number;
  prix_median: number;
  prix_m2_median: number;
}

export interface CommuneStats {
  nom_commune: string;
  nb_transactions: number;
  prix_median: number;
  prix_m2_median: number;
  surface_mediane: number;
  pieces_mediane: number;
}

export interface TypeStats {
  type_local: string;
  nb_transactions: number;
  prix_median: number;
}

export interface PriceDistBucket {
  bucket: string;
  count: number;
}

export interface MapPoint {
  id_mutation: string;
  longitude: number;
  latitude: number;
  valeur_fonciere: number;
  prix_m2: number | null;
  type_local: string;
  nom_commune: string;
  surface_reelle_bati: number | null;
  surface_terrain: number | null;
  nombre_pieces_principales: number | null;
  date_mutation: string;
  nature_culture: string | null;
}

export interface TimeSeriesByPieces {
  annee: number;
  pieces: number;
  prix_median: number;
}

export interface TimeSeriesByCommune {
  annee: number;
  nom_commune: string;
  nb_transactions: number;
}

export interface CrosstabRow {
  pieces: number;
  nb: number;
  prix_m2_median: number;
  valeur_mediane: number;
  surface_mediane: number;
}

export interface TransactionRow {
  date_mutation: string;
  type_local: string;
  valeur_fonciere: number;
  prix_m2: number | null;
  surface_reelle_bati: number | null;
  surface_terrain: number | null;
  nombre_pieces_principales: number | null;
  nom_commune: string;
}

export function useDvf(initialFilters: Filters = DEFAULT_FILTERS) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [kpis, setKpis] = useState<KpiData | null>(null);
  const [timeSeries, setTimeSeries] = useState<TimeSeriesPoint[]>([]);
  const [timeSeriesByType, setTimeSeriesByType] = useState<TimeSeriesByType[]>([]);
  const [communeStats, setCommuneStats] = useState<CommuneStats[]>([]);
  const [typeStats, setTypeStats] = useState<TypeStats[]>([]);
  const [priceDistribution, setPriceDistribution] = useState<PriceDistBucket[]>([]);
  const [mapPoints, setMapPoints] = useState<MapPoint[]>([]);
  const [communes, setCommunes] = useState<string[]>([]);
  const [timeSeriesByPieces, setTimeSeriesByPieces] = useState<TimeSeriesByPieces[]>([]);
  const [timeSeriesByCommune, setTimeSeriesByCommune] = useState<TimeSeriesByCommune[]>([]);
  const [crosstab, setCrosstab] = useState<CrosstabRow[]>([]);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [focusCommune, setFocusCommune] = useState<string | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    loadParquet("/data/dvf.parquet")
      .then(async () => {
        const communeList = await queryDvf<{ nom_commune: string }>(
          "SELECT DISTINCT nom_commune FROM dvf ORDER BY nom_commune"
        );
        setCommunes(communeList.map((c) => c.nom_commune));
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const refresh = useCallback(async () => {
    if (loading) return;
    const where = buildWhereClause(filters);
    try {
      const [kpiResult, tsResult, tsByTypeResult, tsByPiecesResult, tsByCommuneResult, communeResult, typeResult, priceDistResult, mapResult] =
        await Promise.all([
          queryDvf<KpiData>(`
            SELECT COUNT(*)::INTEGER as "totalTransactions",
              MEDIAN(valeur_fonciere)::INTEGER as "prixMedian",
              MEDIAN(prix_m2)::INTEGER as "prixM2Median",
              MEDIAN(COALESCE(surface_reelle_bati, surface_terrain))::INTEGER as "surfaceMediane",
              ROUND(AVG(nombre_pieces_principales), 1) as "piecesMoyen",
              ROUND(AVG(surface_reelle_bati))::INTEGER as "surfaceBatiMoyenne",
              ROUND(AVG(surface_terrain))::INTEGER as "surfaceTerrainMoyenne"
            FROM dvf ${where}
          `),
          queryDvf<TimeSeriesPoint>(`
            SELECT annee::INTEGER as annee, COUNT(*)::INTEGER as nb_transactions,
              MEDIAN(valeur_fonciere)::INTEGER as prix_median,
              MEDIAN(prix_m2)::INTEGER as prix_m2_median
            FROM dvf ${where} GROUP BY annee ORDER BY annee
          `),
          queryDvf<TimeSeriesByType>(`
            SELECT annee::INTEGER as annee, type_local,
              COUNT(*)::INTEGER as nb_transactions,
              MEDIAN(valeur_fonciere)::INTEGER as prix_median,
              MEDIAN(prix_m2)::INTEGER as prix_m2_median
            FROM dvf ${where} GROUP BY annee, type_local ORDER BY annee, type_local
          `),
          queryDvf<TimeSeriesByPieces>(`
            SELECT annee::INTEGER as annee,
              nombre_pieces_principales::INTEGER as pieces,
              MEDIAN(valeur_fonciere)::INTEGER as prix_median
            FROM dvf ${where}
              AND nombre_pieces_principales IS NOT NULL
              AND nombre_pieces_principales BETWEEN 1 AND 6
            GROUP BY annee, nombre_pieces_principales
            ORDER BY annee, nombre_pieces_principales
          `),
          queryDvf<TimeSeriesByCommune>(`
            SELECT t.annee::INTEGER as annee, t.nom_commune,
              COUNT(*)::INTEGER as nb_transactions
            FROM dvf t
            WHERE t.nom_commune IN (
              SELECT nom_commune FROM dvf ${where}
              GROUP BY nom_commune ORDER BY COUNT(*) DESC LIMIT 15
            )
            ${where ? where.replace("WHERE", "AND") : ""}
            GROUP BY t.annee, t.nom_commune
            ORDER BY t.annee, t.nom_commune
          `),
          queryDvf<CommuneStats>(`
            SELECT nom_commune, COUNT(*)::INTEGER as nb_transactions,
              MEDIAN(valeur_fonciere)::INTEGER as prix_median,
              MEDIAN(prix_m2)::INTEGER as prix_m2_median,
              MEDIAN(COALESCE(surface_reelle_bati, surface_terrain))::INTEGER as surface_mediane,
              MEDIAN(nombre_pieces_principales)::INTEGER as pieces_mediane
            FROM dvf ${where} GROUP BY nom_commune ORDER BY nb_transactions DESC LIMIT 30
          `),
          queryDvf<TypeStats>(`
            SELECT type_local, COUNT(*)::INTEGER as nb_transactions,
              MEDIAN(valeur_fonciere)::INTEGER as prix_median
            FROM dvf ${where} GROUP BY type_local ORDER BY nb_transactions DESC
          `),
          queryDvf<PriceDistBucket>(`
            SELECT
              CASE
                WHEN valeur_fonciere < 50000 THEN '< 50k'
                WHEN valeur_fonciere < 100000 THEN '50-100k'
                WHEN valeur_fonciere < 150000 THEN '100-150k'
                WHEN valeur_fonciere < 200000 THEN '150-200k'
                WHEN valeur_fonciere < 250000 THEN '200-250k'
                WHEN valeur_fonciere < 300000 THEN '250-300k'
                WHEN valeur_fonciere < 400000 THEN '300-400k'
                WHEN valeur_fonciere < 500000 THEN '400-500k'
                WHEN valeur_fonciere < 750000 THEN '500-750k'
                ELSE '750k+'
              END as bucket, COUNT(*)::INTEGER as count
            FROM dvf ${where} GROUP BY bucket ORDER BY MIN(valeur_fonciere)
          `),
          queryDvf<MapPoint>(`
            SELECT id_mutation, longitude, latitude, valeur_fonciere, prix_m2,
              type_local, nom_commune, surface_reelle_bati, surface_terrain,
              nombre_pieces_principales, date_mutation::VARCHAR as date_mutation,
              nature_culture
            FROM dvf ${where}
          `),
        ]);
      setKpis(kpiResult[0] || null);
      setTimeSeries(tsResult);
      setTimeSeriesByType(tsByTypeResult);
      setTimeSeriesByPieces(tsByPiecesResult);
      setTimeSeriesByCommune(tsByCommuneResult);
      setCommuneStats(communeResult);
      setTypeStats(typeResult);
      setPriceDistribution(priceDistResult);
      setMapPoints(mapResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [filters, loading]);

  const refreshFocus = useCallback(async () => {
    if (loading || !focusCommune) {
      setCrosstab([]);
      setTransactions([]);
      return;
    }
    const baseWhere = buildWhereClause(filters);
    const cc = `nom_commune = '${focusCommune.replace(/'/g, "''")}'`;
    const focusWhere = baseWhere ? `${baseWhere} AND ${cc}` : `WHERE ${cc}`;
    try {
      const [crosstabResult, txResult] = await Promise.all([
        queryDvf<CrosstabRow>(`
          SELECT nombre_pieces_principales::INTEGER as pieces, COUNT(*)::INTEGER as nb,
            MEDIAN(prix_m2)::INTEGER as prix_m2_median,
            MEDIAN(valeur_fonciere)::INTEGER as valeur_mediane,
            MEDIAN(surface_reelle_bati)::INTEGER as surface_mediane
          FROM dvf ${focusWhere}
            AND type_local IN ('Maison', 'Appartement')
            AND nombre_pieces_principales IS NOT NULL
            AND nombre_pieces_principales BETWEEN 1 AND 6
          GROUP BY nombre_pieces_principales ORDER BY nombre_pieces_principales
        `),
        queryDvf<TransactionRow>(`
          SELECT date_mutation::VARCHAR as date_mutation, type_local, valeur_fonciere,
            prix_m2, surface_reelle_bati, surface_terrain,
            nombre_pieces_principales, nom_commune
          FROM dvf ${focusWhere} ORDER BY date_mutation DESC LIMIT 100
        `),
      ]);
      setCrosstab(crosstabResult);
      setTransactions(txResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [focusCommune, filters, loading]);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => { refreshFocus(); }, [refreshFocus]);

  return {
    loading, error, filters, setFilters, kpis,
    timeSeries, timeSeriesByType, timeSeriesByPieces, timeSeriesByCommune,
    communeStats, typeStats, priceDistribution, mapPoints, communes,
    focusCommune, setFocusCommune, crosstab, transactions,
  };
}
