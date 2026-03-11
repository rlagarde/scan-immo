"use client";

import { Home, Euro, Ruler, BarChart3, DoorOpen, Building2, TreePine, type LucideIcon } from "lucide-react";
import type { KpiData } from "@/hooks/use-dvf";

function formatCompact(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2).replace(".", ",") + "M";
  if (n >= 10_000) return (n / 1_000).toFixed(1).replace(".", ",") + "k";
  return n.toLocaleString("fr-FR");
}

function formatNumber(n: number | null | undefined): string {
  if (n == null) return "—";
  return formatCompact(n);
}

function formatPrice(n: number | null | undefined): string {
  if (n == null) return "—";
  return formatCompact(n) + " €";
}

interface KpiItem {
  title: string;
  value: string;
  icon: LucideIcon;
}

function KpiStrip({ items }: { items: KpiItem[] }) {
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-2 rounded-lg border bg-card px-4 py-3">
      {items.map((item, i) => (
        <div key={item.title} className="flex items-center gap-2">
          <item.icon className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="flex items-baseline gap-1.5">
            <span className="text-xs text-muted-foreground whitespace-nowrap">{item.title}</span>
            <span className="text-sm font-bold whitespace-nowrap">{item.value}</span>
          </div>
          {i < items.length - 1 && (
            <span className="hidden sm:block ml-4 h-4 w-px bg-border" />
          )}
        </div>
      ))}
    </div>
  );
}

export function KpiCards({ data }: { data: KpiData | null }) {
  const items: KpiItem[] = [
    { title: "Transactions", value: formatNumber(data?.totalTransactions), icon: BarChart3 },
    { title: "Prix médian", value: formatPrice(data?.prixMedian), icon: Euro },
    { title: "Prix/m²", value: formatPrice(data?.prixM2Median), icon: Home },
    { title: "Surface méd.", value: data?.surfaceMediane ? `${formatNumber(data.surfaceMediane)} m²` : "—", icon: Ruler },
    { title: "Pièces moy.", value: data?.piecesMoyen != null ? String(data.piecesMoyen) : "—", icon: DoorOpen },
    { title: "Surface bâtie", value: data?.surfaceBatiMoyenne ? `${formatNumber(data.surfaceBatiMoyenne)} m²` : "—", icon: Building2 },
  ];
  return <KpiStrip items={items} />;
}

export function KpiCardsTerrain({ data }: { data: KpiData | null }) {
  const items: KpiItem[] = [
    { title: "Transactions", value: formatNumber(data?.totalTransactions), icon: BarChart3 },
    { title: "Prix médian", value: formatPrice(data?.prixMedian), icon: Euro },
    { title: "Surface méd.", value: data?.surfaceMediane ? `${formatNumber(data.surfaceMediane)} m²` : "—", icon: Ruler },
    { title: "Surface terrain", value: data?.surfaceTerrainMoyenne ? `${formatNumber(data.surfaceTerrainMoyenne)} m²` : "—", icon: TreePine },
  ];
  return <KpiStrip items={items} />;
}
