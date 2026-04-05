"use client";

import dynamic from "next/dynamic";
import { useDvf, type Filters, DEFAULT_FILTERS } from "@/hooks/use-dvf";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { FiltersBar } from "@/components/dashboard/filters-bar";
import {
  PriceEvolutionChart,
  PriceM2ByTypeChart,
  TransactionsByTypeChart,
  PriceDistributionChart,
  PriceByPiecesChart,
  PriceByCommuneChart,
  CommunePrixM2Chart,
  CommunePrixMedianChart,
} from "@/components/dashboard/charts";
import { CommuneTable } from "@/components/dashboard/commune-table";
import { FocusCommune } from "@/components/dashboard/focus-commune";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { NavHeader } from "@/components/nav-header";

// Dynamic import for map (no SSR - maplibre needs window)
const DvfMap = dynamic(
  () => import("@/components/map/dvf-map").then((mod) => mod.DvfMap),
  { ssr: false, loading: () => <MapSkeleton /> }
);

const HABITATION_FILTERS: Filters = {
  ...DEFAULT_FILTERS,
  typesLocal: ["Maison", "Appartement"],
};

function MapSkeleton() {
  return (
    <div className="w-full h-[400px] lg:h-[500px] rounded-lg border bg-muted animate-pulse flex items-center justify-center">
      <p className="text-muted-foreground">Chargement de la carte...</p>
    </div>
  );
}

export default function Home() {
  const {
    loading,
    error,
    filters,
    setFilters,
    kpis,
    timeSeries,
    timeSeriesByType,
    timeSeriesByPieces,
    timeSeriesByCommune,
    communeStats,
    priceDistribution,
    mapPoints,
    communes,
    focusCommune,
    setFocusCommune,
    crosstab,
    transactions,
  } = useDvf(HABITATION_FILTERS);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">
          Chargement des données DVF...
        </p>
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
      <NavHeader />

      <div className="container mx-auto px-4 py-4 space-y-4">
        <FiltersBar
          filters={filters}
          onFilterChange={setFilters}
          communes={communes}
        />

        <KpiCards data={kpis} />

        <Tabs defaultValue="carte" className="w-full">
          <TabsList className="w-full justify-start gap-2 bg-transparent p-0">
            <TabsTrigger value="carte" className="bg-muted">Carte</TabsTrigger>
            <TabsTrigger value="prix" className="bg-muted">Prix</TabsTrigger>
            <TabsTrigger value="communes" className="bg-muted">Communes</TabsTrigger>
          </TabsList>

          <TabsContent value="carte" className="mt-4">
            <DvfMap points={mapPoints} />
          </TabsContent>

          <TabsContent value="prix" className="mt-4 space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <PriceEvolutionChart data={timeSeries} />
              <PriceM2ByTypeChart data={timeSeriesByType} />
              <PriceByPiecesChart data={timeSeriesByPieces} />
              <TransactionsByTypeChart data={timeSeriesByType} />
              <PriceDistributionChart data={priceDistribution} />
            </div>

            <PriceByCommuneChart data={timeSeriesByCommune} topN={5} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <CommunePrixM2Chart data={communeStats} />
              <CommunePrixMedianChart data={communeStats} />
            </div>
          </TabsContent>

          <TabsContent value="communes" className="mt-4 space-y-4">
            <CommuneTable
              data={communeStats}
              onCommuneClick={setFocusCommune}
            />

            <FocusCommune
              commune={focusCommune}
              crosstab={crosstab}
              transactions={transactions}
              onClose={() => setFocusCommune(null)}
            />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
