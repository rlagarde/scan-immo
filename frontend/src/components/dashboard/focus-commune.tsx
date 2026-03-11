"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
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
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2).replace(".", ",")}M €`;
  if (n >= 10_000) return `${(n / 1_000).toFixed(1).replace(".", ",")}k €`;
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

// --- Transactions list ---
function TransactionsList({ data }: { data: TransactionRow[] }) {
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
              <th className="py-2 pr-3 font-medium">Date</th>
              <th className="py-2 pr-3 font-medium">Type</th>
              <th className="py-2 pr-3 font-medium text-right">Prix</th>
              <th className="py-2 pr-3 font-medium text-right">Prix/m²</th>
              <th className="py-2 pr-3 font-medium text-right">Surface</th>
              <th className="py-2 font-medium text-right">Pièces</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
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

// --- Main Focus Commune ---
export function FocusCommune({
  commune,
  crosstab,
  transactions,
  onClose,
  showCrosstab = true,
}: {
  commune: string;
  crosstab: CrosstabRow[];
  transactions: TransactionRow[];
  onClose: () => void;
  showCrosstab?: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-bold">{commune}</h2>
        <button
          onClick={onClose}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
          Fermer
        </button>
      </div>

      {showCrosstab && <CrosstabTable data={crosstab} />}
      <TransactionsList data={transactions} />
    </div>
  );
}
