"use client";

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  TimeSeriesPoint,
  TimeSeriesByType,
  TimeSeriesByPieces,
  TimeSeriesByCommune,
  CommuneStats,
  PriceDistBucket,
} from "@/hooks/use-dvf";

const TOOLTIP_STYLE: React.CSSProperties = {
  backgroundColor: "var(--popover)",
  borderColor: "var(--border)",
  color: "var(--popover-foreground)",
  borderRadius: "0.5rem",
};

// Cursor overlay for bar charts (semi-transparent, theme-aware via currentColor)
const BAR_CURSOR = { fill: "currentColor", fillOpacity: 0.08 };

const TYPE_COLORS: Record<string, string> = {
  Maison: "#2563eb",
  Appartement: "#f59e0b",
  Terrain: "#10b981",
};

function formatEuro(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M €`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k €`;
  return `${value} €`;
}

function formatEuroFull(value: number): string {
  return value.toLocaleString("fr-FR") + " €";
}

// --- Prix évolution globale ---
export function PriceEvolutionChart({ data }: { data: TimeSeriesPoint[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Prix médian global</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="annee" className="text-xs" />
            <YAxis tickFormatter={formatEuro} className="text-xs" width={70} />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any) => [formatEuro(Number(value)), "Prix médian"]}
            />
            <Line type="monotone" dataKey="prix_median" stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// --- Évolution prix/m² par type de bien ---
export function PriceM2ByTypeChart({ data }: { data: TimeSeriesByType[] }) {
  // Pivot: one row per year, columns: Maison, Appartement, Terrain
  const types = [...new Set(data.map((d) => d.type_local))];
  const years = [...new Set(data.map((d) => d.annee))].sort();
  const pivoted = years.map((annee) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row: any = { annee };
    types.forEach((t) => {
      const match = data.find((d) => d.annee === annee && d.type_local === t);
      row[t] = match?.prix_m2_median ?? null;
    });
    return row;
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Prix/m² par type de bien</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={pivoted}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="annee" className="text-xs" />
            <YAxis tickFormatter={formatEuroFull} className="text-xs" width={80} />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any, name: any) => [formatEuroFull(Number(value)), String(name)]}
            />
            <Legend />
            {types.map((t) => (
              <Line key={t} type="monotone" dataKey={t} stroke={TYPE_COLORS[t] || "#666"} strokeWidth={2} dot={{ r: 3 }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// --- Transactions par type par année ---
export function TransactionsByTypeChart({ data }: { data: TimeSeriesByType[] }) {
  const types = [...new Set(data.map((d) => d.type_local))];
  const years = [...new Set(data.map((d) => d.annee))].sort();
  const pivoted = years.map((annee) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row: any = { annee };
    types.forEach((t) => {
      const match = data.find((d) => d.annee === annee && d.type_local === t);
      row[t] = match?.nb_transactions ?? 0;
    });
    return row;
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Transactions par type / année</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={pivoted}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="annee" className="text-xs" />
            <YAxis className="text-xs" width={50} />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              cursor={BAR_CURSOR}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any, name: any) => [Number(value).toLocaleString("fr-FR"), String(name)]}
            />
            <Legend />
            {types.map((t) => (
              <Bar key={t} dataKey={t} fill={TYPE_COLORS[t] || "#666"} stackId="a" />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// --- Distribution des prix ---
export function PriceDistributionChart({ data }: { data: PriceDistBucket[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Distribution des prix</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="bucket" className="text-xs" angle={-30} textAnchor="end" height={50} />
            <YAxis className="text-xs" width={50} />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              cursor={BAR_CURSOR}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any) => [Number(value).toLocaleString("fr-FR"), "Transactions"]}
            />
            <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// --- Prix/m² par commune ---
export function CommunePrixM2Chart({ data, onCommuneClick }: { data: CommuneStats[]; onCommuneClick?: (commune: string) => void }) {
  const top15 = [...data]
    .sort((a, b) => (b.prix_m2_median || 0) - (a.prix_m2_median || 0))
    .slice(0, 15);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Prix/m² médian par commune (top 15)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={top15} layout="vertical" onClick={(e) => {
            if (e?.activeLabel && onCommuneClick) onCommuneClick(String(e.activeLabel));
          }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis type="number" tickFormatter={formatEuroFull} className="text-xs" />
            <YAxis type="category" dataKey="nom_commune" width={130} className="text-xs" tick={{ fontSize: 11, cursor: onCommuneClick ? "pointer" : "default" }} />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              cursor={BAR_CURSOR}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any) => [formatEuroFull(Number(value)), "Prix/m²"]}
            />
            <Bar dataKey="prix_m2_median" name="Prix/m²" fill="#2563eb" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
        {onCommuneClick && <p className="text-xs text-muted-foreground mt-2">Cliquer sur une commune pour voir le détail</p>}
      </CardContent>
    </Card>
  );
}

// --- Évolution prix médian par nb pièces ---
const PIECES_COLORS: Record<number, string> = {
  1: "#ef4444", 2: "#f59e0b", 3: "#10b981", 4: "#2563eb", 5: "#8b5cf6", 6: "#ec4899",
};

export function PriceByPiecesChart({ data }: { data: TimeSeriesByPieces[] }) {
  const pieces = [...new Set(data.map((d) => d.pieces))].sort();
  const years = [...new Set(data.map((d) => d.annee))].sort();
  const pivoted = years.map((annee) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row: any = { annee };
    pieces.forEach((p) => {
      const match = data.find((d) => d.annee === annee && d.pieces === p);
      row[`${p} pce${p > 1 ? "s" : ""}`] = match?.prix_median ?? null;
    });
    return row;
  });
  const keys = pieces.map((p) => `${p} pce${p > 1 ? "s" : ""}`);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Prix médian par nombre de pièces</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={pivoted}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="annee" className="text-xs" />
            <YAxis tickFormatter={formatEuro} className="text-xs" width={70} />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any, name: any) => [formatEuro(Number(value)), String(name)]}
            />
            <Legend />
            {keys.map((k, i) => (
              <Line key={k} type="monotone" dataKey={k} stroke={PIECES_COLORS[pieces[i]] || "#666"} strokeWidth={2} dot={{ r: 3 }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// --- Évolution prix médian par commune (top 15) ---
const COMMUNE_COLORS = [
  "#2563eb", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6",
  "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1",
  "#14b8a6", "#e11d48", "#a855f7", "#0ea5e9", "#d946ef",
];

export function PriceByCommuneChart({ data, topN }: { data: TimeSeriesByCommune[]; topN?: number }) {
  let filtered = data;
  if (topN) {
    const totals = new Map<string, number>();
    data.forEach((d) => {
      totals.set(d.nom_commune, (totals.get(d.nom_commune) ?? 0) + d.nb_transactions);
    });
    const top = [...totals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN)
      .map(([c]) => c);
    const topSet = new Set(top);
    filtered = data.filter((d) => topSet.has(d.nom_commune));
  }
  const communesList = [...new Set(filtered.map((d) => d.nom_commune))];
  const years = [...new Set(filtered.map((d) => d.annee))].sort();
  const pivoted = years.map((annee) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row: any = { annee };
    communesList.forEach((c) => {
      const match = filtered.find((d) => d.annee === annee && d.nom_commune === c);
      row[c] = match?.nb_transactions ?? null;
    });
    return row;
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Ventes par commune (top {topN ?? 15})</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={pivoted}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="annee" className="text-xs" />
            <YAxis className="text-xs" width={50} />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any, name: any) => [Number(value).toLocaleString("fr-FR"), String(name)]}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {communesList.map((c, i) => (
              <Line key={c} type="monotone" dataKey={c} stroke={COMMUNE_COLORS[i % COMMUNE_COLORS.length]} strokeWidth={1.5} dot={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// --- Prix médian par commune ---
export function CommunePrixMedianChart({ data, onCommuneClick }: { data: CommuneStats[]; onCommuneClick?: (commune: string) => void }) {
  const top15 = [...data]
    .sort((a, b) => (b.prix_median || 0) - (a.prix_median || 0))
    .slice(0, 15);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Prix médian par commune (top 15)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={top15} layout="vertical" onClick={(e) => {
            if (e?.activeLabel && onCommuneClick) onCommuneClick(String(e.activeLabel));
          }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis type="number" tickFormatter={formatEuro} className="text-xs" />
            <YAxis type="category" dataKey="nom_commune" width={130} className="text-xs" tick={{ fontSize: 11, cursor: onCommuneClick ? "pointer" : "default" }} />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              cursor={BAR_CURSOR}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any) => [formatEuro(Number(value)), "Prix médian"]}
            />
            <Bar dataKey="prix_median" name="Prix médian" fill="#f59e0b" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
        {onCommuneClick && <p className="text-xs text-muted-foreground mt-2">Cliquer sur une commune pour voir le détail</p>}
      </CardContent>
    </Card>
  );
}
