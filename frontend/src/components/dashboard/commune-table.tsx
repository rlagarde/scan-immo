"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CommuneStats } from "@/hooks/use-dvf";

function fmt(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString("fr-FR");
}

function fmtEuro(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString("fr-FR") + " €";
}

export function CommuneTable({
  data,
  onCommuneClick,
}: {
  data: CommuneStats[];
  onCommuneClick?: (commune: string) => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Comparatif communes</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="py-2 pr-4 font-medium">Commune</th>
              <th className="py-2 pr-4 font-medium text-right">Transactions</th>
              <th className="py-2 pr-4 font-medium text-right">Prix médian</th>
              <th className="py-2 pr-4 font-medium text-right">Prix/m²</th>
              <th className="py-2 pr-4 font-medium text-right">Surface méd.</th>
              <th className="py-2 font-medium text-right">Pièces méd.</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr
                key={row.nom_commune}
                className="border-b hover:bg-accent/50 cursor-pointer transition-colors"
                onClick={() => onCommuneClick?.(row.nom_commune)}
              >
                <td className="py-2 pr-4 font-medium text-primary">{row.nom_commune}</td>
                <td className="py-2 pr-4 text-right">{fmt(row.nb_transactions)}</td>
                <td className="py-2 pr-4 text-right">{fmtEuro(row.prix_median)}</td>
                <td className="py-2 pr-4 text-right">{fmtEuro(row.prix_m2_median)}</td>
                <td className="py-2 pr-4 text-right">{row.surface_mediane ? `${fmt(row.surface_mediane)} m²` : "—"}</td>
                <td className="py-2 text-right">{fmt(row.pieces_mediane)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
