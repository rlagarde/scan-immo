"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CrosstabRow, TransactionRow } from "@/hooks/use-dvf";

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

const TYPE_SHORT: Record<string, string> = {
  Appartement: "Appt",
  Maison: "Maison",
  Terrain: "Terrain",
};

// --- Crosstab by pieces ---
function CrosstabTable({ data }: { data: CrosstabRow[] }) {
  if (data.length === 0) return <p className="text-sm text-muted-foreground">Pas de données par pièces</p>;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Statistiques par nombre de pièces</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-muted-foreground">
              <th className="py-2 pr-3 text-left font-medium"></th>
              {data.map((row) => (
                <th key={row.pieces} className="py-2 px-3 text-center font-semibold">
                  {row.pieces} pce{row.pieces > 1 ? "s" : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td className="py-2 pr-3 text-muted-foreground font-medium">Nb ventes</td>
              {data.map((row) => (
                <td key={row.pieces} className="py-2 px-3 text-center">{fmt(row.nb)}</td>
              ))}
            </tr>
            <tr className="border-b">
              <td className="py-2 pr-3 text-muted-foreground font-medium">Prix/m²</td>
              {data.map((row) => (
                <td key={row.pieces} className="py-2 px-3 text-center font-semibold">{fmtEuro(row.prix_m2_median)}</td>
              ))}
            </tr>
            <tr className="border-b">
              <td className="py-2 pr-3 text-muted-foreground font-medium">Valeur méd.</td>
              {data.map((row) => (
                <td key={row.pieces} className="py-2 px-3 text-center">{fmtEuroK(row.valeur_mediane)}</td>
              ))}
            </tr>
            <tr>
              <td className="py-2 pr-3 text-muted-foreground font-medium">Surface méd.</td>
              {data.map((row) => (
                <td key={row.pieces} className="py-2 px-3 text-center">{row.surface_mediane ? `${fmt(row.surface_mediane)} m²` : "—"}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

// --- Transactions list (sortable) ---
type TxSortKey = "date" | "price" | "surface" | "prix_m2" | "pieces";
type SortDir = "asc" | "desc";

interface SortHeaderProps {
  label: string;
  sortKey: TxSortKey;
  currentKey: TxSortKey;
  dir: SortDir;
  onSort: (key: TxSortKey) => void;
  align?: "left" | "right";
}

function SortHeader({ label, sortKey, currentKey, dir, onSort, align = "right" }: SortHeaderProps) {
  const active = currentKey === sortKey;
  const Icon = !active ? ArrowUpDown : dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <th className={cn("py-2 pr-3 font-medium", align === "right" ? "text-right" : "text-left")}>
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

function rowSurface(row: TransactionRow): number {
  return row.surface_reelle_bati ?? row.surface_terrain ?? 0;
}

function TransactionsList({ data }: { data: TransactionRow[] }) {
  const [sortKey, setSortKey] = useState<TxSortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const handleSort = (key: TxSortKey) => {
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
      let av: number, bv: number;
      if (sortKey === "date") {
        av = new Date(a.date_mutation).getTime();
        bv = new Date(b.date_mutation).getTime();
      } else if (sortKey === "price") {
        av = a.valeur_fonciere ?? 0;
        bv = b.valeur_fonciere ?? 0;
      } else if (sortKey === "prix_m2") {
        av = a.prix_m2 ?? 0;
        bv = b.prix_m2 ?? 0;
      } else if (sortKey === "pieces") {
        av = a.nombre_pieces_principales ?? 0;
        bv = b.nombre_pieces_principales ?? 0;
      } else {
        av = rowSurface(a);
        bv = rowSurface(b);
      }
      return sortDir === "asc" ? av - bv : bv - av;
    });
    return arr;
  }, [data, sortKey, sortDir]);

  if (data.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Dernières transactions ({data.length})</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <SortHeader label="Date" sortKey="date" currentKey={sortKey} dir={sortDir} onSort={handleSort} align="left" />
              <th className="py-2 pr-3 font-medium">Type</th>
              <SortHeader label="Prix" sortKey="price" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
              <SortHeader label="Prix/m²" sortKey="prix_m2" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
              <SortHeader label="Surface" sortKey="surface" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
              <SortHeader label="Pièces" sortKey="pieces" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <tr key={i} className="border-b hover:bg-accent/30">
                <td className="py-1.5 pr-3 text-xs text-muted-foreground">{row.date_mutation}</td>
                <td className="py-1.5 pr-3">
                  <Badge variant="secondary" className="text-xs">{TYPE_SHORT[row.type_local] ?? row.type_local}</Badge>
                </td>
                <td className="py-1.5 pr-3 text-right font-medium">{fmtEuroK(row.valeur_fonciere)}</td>
                <td className="py-1.5 pr-3 text-right">{fmtEuro(row.prix_m2)}</td>
                <td className="py-1.5 pr-3 text-right">
                  {row.surface_reelle_bati ? `${fmt(row.surface_reelle_bati)} m²` : row.surface_terrain ? `${fmt(row.surface_terrain)} m² (terrain)` : "—"}
                </td>
                <td className="py-1.5 text-right">{fmt(row.nombre_pieces_principales)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

// --- Main Focus Commune (Dialog) ---
export function FocusCommune({
  commune,
  crosstab,
  transactions,
  onClose,
  showCrosstab = true,
}: {
  commune: string | null;
  crosstab: CrosstabRow[];
  transactions: TransactionRow[];
  onClose: () => void;
  showCrosstab?: boolean;
}) {
  return (
    <Dialog open={!!commune} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">{commune}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {showCrosstab && <CrosstabTable data={crosstab} />}
          <TransactionsList data={transactions} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
