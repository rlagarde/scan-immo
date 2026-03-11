"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useDvf, type Filters, DEFAULT_FILTERS } from "@/hooks/use-dvf";
import { KpiCardsTerrain } from "@/components/dashboard/kpi-cards";
import { FiltersBarTerrain } from "@/components/dashboard/filters-bar";
import {
  PriceEvolutionChart,
  PriceDistributionChart,
  PriceByCommuneChart,
  CommunePrixMedianChart,
} from "@/components/dashboard/charts";
import { CommuneTable } from "@/components/dashboard/commune-table";
import { FocusCommune } from "@/components/dashboard/focus-commune";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";

const DvfHeatmap = dynamic(
  () => import("@/components/map/dvf-heatmap").then((mod) => mod.DvfHeatmap),
  { ssr: false, loading: () => <MapSkeleton /> }
);

function MapSkeleton() {
  return (
    <div className="w-full h-[400px] lg:h-[500px] rounded-lg border bg-muted animate-pulse flex items-center justify-center">
      <p className="text-muted-foreground">Chargement de la carte...</p>
    </div>
  );
}

const TERRAIN_FILTERS: Filters = {
  ...DEFAULT_FILTERS,
  typesLocal: ["Terrain"],
  surfaceTerrainMax: 5000,
  natureCultures: ["sols", "terrains a b\u00e2tir"],
};

export default function TerrainsPage() {
  const {
    loading,
    error,
    filters,
    setFilters,
    kpis,
    timeSeries,
    timeSeriesByCommune,
    communeStats,
    priceDistribution,
    mapPoints,
    communes,
    focusCommune,
    setFocusCommune,
    crosstab,
    transactions,
  } = useDvf(TERRAIN_FILTERS);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Chargement des données DVF...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-2">
          <p className="text-destructive font-semibold">Erreur</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">DVF — Terrains</h1>
            <p className="text-sm text-muted-foreground">
              Terrains — Landes (40) &amp; Pyrénées-Atlantiques (64)
            </p>
          </div>
          <Link href="/" className="text-sm font-medium text-primary hover:underline">
            ← Habitations
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-4 space-y-4">
        <FiltersBarTerrain
          filters={filters}
          onFilterChange={setFilters}
          communes={communes}
        />

        <KpiCardsTerrain data={kpis} />

        <Tabs defaultValue="carte" className="w-full">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="carte">Carte</TabsTrigger>
            <TabsTrigger value="prix">Prix</TabsTrigger>
            <TabsTrigger value="communes">Communes</TabsTrigger>
          </TabsList>

          <TabsContent value="carte" className="mt-4">
            <DvfHeatmap points={mapPoints} />
          </TabsContent>

          <TabsContent value="prix" className="mt-4 space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <PriceEvolutionChart data={timeSeries} />
              <PriceDistributionChart data={priceDistribution} />
            </div>
          </TabsContent>

          <TabsContent value="communes" className="mt-4 space-y-4">
            <PriceByCommuneChart data={timeSeriesByCommune} />

            {focusCommune ? (
              <FocusCommune
                commune={focusCommune}
                crosstab={crosstab}
                transactions={transactions}
                onClose={() => setFocusCommune(null)}
                showCrosstab={false}
              />
            ) : null}

            <CommunePrixMedianChart
              data={communeStats}
              onCommuneClick={setFocusCommune}
            />
            <CommuneTable
              data={communeStats}
              onCommuneClick={setFocusCommune}
            />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
