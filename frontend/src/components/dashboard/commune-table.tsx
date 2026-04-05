"use client";

import { useState, useMemo } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CommuneStats } from "@/hooks/use-dvf";
import { cn } from "@/lib/utils";

function fmt(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString("fr-FR");
}

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

type SortKey = "nb_transactions" | "prix_median" | "prix_m2_median" | "surface_mediane";
type SortDir = "asc" | "desc";

interface SortHeaderProps {
  label: string;
  sortKey: SortKey;
  currentKey: SortKey;
  dir: SortDir;
  onSort: (key: SortKey) => void;
}

function SortHeader({ label, sortKey, currentKey, dir, onSort }: SortHeaderProps) {
  const active = currentKey === sortKey;
  const Icon = !active ? ArrowUpDown : dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <th className="py-2 pr-4 font-medium text-right">
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          "inline-flex items-center gap-1 hover:text-foreground transition-colors",
          active && "text-foreground"
        )}
      >
        {label}
        <Icon className="h-3 w-3" />
      </button>
    </th>
  );
}

export function CommuneTable({
  data,
  onCommuneClick,
}: {
  data: CommuneStats[];
  onCommuneClick?: (commune: string) => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("nb_transactions");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const sorted = useMemo(() => {
    const arr = [...data];
    arr.sort((a, b) => {
      const av = a[sortKey] ?? -Infinity;
      const bv = b[sortKey] ?? -Infinity;
      return sortDir === "asc" ? av - bv : bv - av;
    });
    return arr;
  }, [data, sortKey, sortDir]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Comparatif communes</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {onCommuneClick && (
          <p className="text-xs text-muted-foreground mb-2">Cliquer sur une commune pour voir le détail</p>
        )}
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="py-2 pr-4 font-medium">Commune</th>
              <SortHeader label="Ventes" sortKey="nb_transactions" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
              <SortHeader label="Prix méd." sortKey="prix_median" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
              <SortHeader label="Prix/m²" sortKey="prix_m2_median" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
              <SortHeader label="Surface" sortKey="surface_mediane" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr
                key={row.nom_commune}
                className="border-b hover:bg-accent/50 cursor-pointer transition-colors"
                onClick={() => onCommuneClick?.(row.nom_commune)}
              >
                <td className="py-2 pr-4 font-medium text-primary">{row.nom_commune}</td>
                <td className="py-2 pr-4 text-right">{fmt(row.nb_transactions)}</td>
                <td className="py-2 pr-4 text-right">{fmtEuroK(row.prix_median)}</td>
                <td className="py-2 pr-4 text-right">{fmtEuro(row.prix_m2_median)}</td>
                <td className="py-2 pr-4 text-right">{row.surface_mediane ? `${fmt(row.surface_mediane)} m²` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
