"use client";

import { useState, useMemo } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { TimeSeriesByCommune, CommuneStats } from "@/hooks/use-dvf";

function fmtEuro(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString("fr-FR") + " €";
}

function fmtEuroK(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${Math.round(n / 1_000_000)}M €`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k €`;
  return n.toLocaleString("fr-FR") + " €";
}

function fmtPct(n: number | null): string {
  if (n == null) return "—";
  return `${n > 0 ? "+" : ""}${n.toFixed(1)}%`;
}

function pctChange(current: number | null, previous: number | null): number | null {
  if (current == null || previous == null || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

function heatBg(pct: number | null): string {
  if (pct == null) return "transparent";
  const clamped = Math.max(-30, Math.min(30, pct));
  if (clamped >= 0) {
    const intensity = clamped / 30;
    return `rgba(16, 185, 129, ${0.1 + intensity * 0.5})`;
  } else {
    const intensity = Math.abs(clamped) / 30;
    return `rgba(239, 68, 68, ${0.1 + intensity * 0.5})`;
  }
}

// --- Sparkline SVG ---
function Sparkline({ values, years }: { values: (number | null)[]; years: number[] }) {
  const points = years
    .map((y, i) => ({ y, v: values[i] }))
    .filter((p) => p.v != null) as { y: number; v: number }[];
  if (points.length < 2) return <span className="text-muted-foreground text-xs">—</span>;

  const minV = Math.min(...points.map((p) => p.v));
  const maxV = Math.max(...points.map((p) => p.v));
  const range = maxV - minV || 1;
  const w = 80;
  const h = 24;
  const pad = 2;

  const pathData = points
    .map((p, i) => {
      const x = pad + (i / (points.length - 1)) * (w - pad * 2);
      const y2 = pad + (1 - (p.v - minV) / range) * (h - pad * 2);
      return `${i === 0 ? "M" : "L"}${x},${y2}`;
    })
    .join(" ");

  const last = points[points.length - 1];
  const first = points[0];
  const trending = last.v >= first.v;

  return (
    <svg width={w} height={h} className="inline-block">
      <path d={pathData} fill="none" stroke={trending ? "#10b981" : "#ef4444"} strokeWidth={1.5} />
      <circle
        cx={pad + (w - pad * 2)}
        cy={pad + (1 - (last.v - minV) / range) * (h - pad * 2)}
        r={2}
        fill={trending ? "#10b981" : "#ef4444"}
      />
    </svg>
  );
}

// --- Sort header ---
type SortKey = "commune" | "nb_transactions" | "prix_m2" | "prix_median" | "pct_1" | "pct_2" | "pct_3" | "pct_4";
type SortDir = "asc" | "desc";

function SortHeader({
  label,
  sub,
  sortKey,
  currentKey,
  dir,
  onSort,
  align = "right",
}: {
  label: string;
  sub?: string;
  sortKey: SortKey;
  currentKey: SortKey;
  dir: SortDir;
  onSort: (key: SortKey) => void;
  align?: "left" | "right" | "center";
}) {
  const active = currentKey === sortKey;
  const Icon = !active ? ArrowUpDown : dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <th className={cn("py-2 px-2 font-medium", align === "left" ? "text-left" : align === "center" ? "text-center" : "text-right")}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          "inline-flex flex-col items-center gap-0 hover:text-foreground transition-colors leading-tight",
          active && "text-foreground"
        )}
      >
        <span className="flex items-center gap-1">
          {label}
          <Icon className="h-3 w-3" />
        </span>
        {sub && <span className="text-[10px] font-normal opacity-60">{sub}</span>}
      </button>
    </th>
  );
}

// --- Row data ---
interface EvolutionRow {
  nom_commune: string;
  nb_transactions: number;
  prix_m2: number | null;
  prix_median: number | null;
  pct_1: number | null;
  pct_2: number | null;
  pct_3: number | null;
  pct_4: number | null;
  sparkValues: (number | null)[];
}

export function CommuneEvolutionTable({
  data,
  communeStats,
  onCommuneClick,
}: {
  data: TimeSeriesByCommune[];
  communeStats?: CommuneStats[];
  onCommuneClick?: (commune: string) => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("pct_1");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const { rows, years } = useMemo(() => {
    const allYears = [...new Set(data.map((d) => d.annee))].sort();
    if (allYears.length < 2) return { rows: [], years: allYears };

    const latest = allYears[allYears.length - 1];
    const communes = [...new Set(data.map((d) => d.nom_commune))];

    const lookup = new Map<string, number | null>();
    data.forEach((d) => {
      if (d.prix_m2_median != null) lookup.set(`${d.nom_commune}_${d.annee}`, d.prix_m2_median);
    });
    const get = (c: string, y: number) => lookup.get(`${c}_${y}`) ?? null;

    const statsMap = new Map<string, CommuneStats>();
    communeStats?.forEach((s) => statsMap.set(s.nom_commune, s));

    const result: EvolutionRow[] = communes.map((c) => {
      const totalTx = data
        .filter((d) => d.nom_commune === c)
        .reduce((sum, d) => sum + d.nb_transactions, 0);
      const sparkValues = allYears.map((y) => get(c, y));
      const stats = statsMap.get(c);
      return {
        nom_commune: c,
        nb_transactions: totalTx,
        prix_m2: get(c, latest),
        prix_median: stats?.prix_median ?? null,
        pct_1: pctChange(get(c, latest), get(c, latest - 1)),
        pct_2: pctChange(get(c, latest), get(c, latest - 2)),
        pct_3: pctChange(get(c, latest), get(c, latest - 3)),
        pct_4: pctChange(get(c, latest), get(c, latest - 4)),
        sparkValues,
      };
    });

    return { rows: result, years: allYears };
  }, [data, communeStats]);

  const sorted = useMemo(() => {
    const arr = [...rows];
    arr.sort((a, b) => {
      if (sortKey === "commune") {
        return sortDir === "asc"
          ? a.nom_commune.localeCompare(b.nom_commune)
          : b.nom_commune.localeCompare(a.nom_commune);
      }
      const av = a[sortKey] ?? -Infinity;
      const bv = b[sortKey] ?? -Infinity;
      return sortDir === "asc" ? av - bv : bv - av;
    });
    return arr;
  }, [rows, sortKey, sortDir]);

  if (years.length < 2) return null;

  const latest = years[years.length - 1];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Évolution prix/m² par commune</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {onCommuneClick && (
          <p className="text-xs text-muted-foreground mb-2">Cliquer sur une commune pour voir le détail</p>
        )}
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-muted-foreground">
              <SortHeader label="Commune" sortKey="commune" currentKey={sortKey} dir={sortDir} onSort={handleSort} align="left" />
              <SortHeader label="Ventes" sortKey="nb_transactions" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
              <SortHeader label="Prix méd." sub={`${latest}`} sortKey="prix_median" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
              <SortHeader label="Prix/m²" sub={`${latest}`} sortKey="prix_m2" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
              <th className="py-2 px-2 text-center font-medium">Tendance</th>
              <SortHeader label={`${latest - 1}→${latest}`} sortKey="pct_1" currentKey={sortKey} dir={sortDir} onSort={handleSort} align="center" />
              <SortHeader label={`${latest - 2}→${latest}`} sortKey="pct_2" currentKey={sortKey} dir={sortDir} onSort={handleSort} align="center" />
              <SortHeader label={`${latest - 3}→${latest}`} sortKey="pct_3" currentKey={sortKey} dir={sortDir} onSort={handleSort} align="center" />
              <SortHeader label={`${latest - 4}→${latest}`} sortKey="pct_4" currentKey={sortKey} dir={sortDir} onSort={handleSort} align="center" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr
                key={row.nom_commune}
                className={cn(
                  "border-b hover:bg-accent/30",
                  onCommuneClick && "cursor-pointer"
                )}
                onClick={() => onCommuneClick?.(row.nom_commune)}
              >
                <td className="py-1.5 px-2 font-medium text-primary">{row.nom_commune}</td>
                <td className="py-1.5 px-2 text-right text-muted-foreground">{row.nb_transactions.toLocaleString("fr-FR")}</td>
                <td className="py-1.5 px-2 text-right">{fmtEuroK(row.prix_median)}</td>
                <td className="py-1.5 px-2 text-right">{fmtEuro(row.prix_m2)}</td>
                <td className="py-1.5 px-2 text-center">
                  <Sparkline values={row.sparkValues} years={years} />
                </td>
                {([row.pct_1, row.pct_2, row.pct_3, row.pct_4] as (number | null)[]).map((pct, i) => (
                  <td
                    key={i}
                    className="py-1.5 px-2 text-center font-medium"
                    style={{ backgroundColor: heatBg(pct) }}
                  >
                    {fmtPct(pct)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
