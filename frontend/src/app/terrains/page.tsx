"use client";

import dynamic from "next/dynamic";
import { useDvf, type Filters, DEFAULT_FILTERS } from "@/hooks/use-dvf";
import { KpiCardsTerrain } from "@/components/dashboard/kpi-cards";
import { FiltersBarTerrain } from "@/components/dashboard/filters-bar";
import {
  PriceEvolutionChart,
  PriceDistributionChart,
  PriceByCommuneChart,
  CommunePrixMedianChart,
} from "@/components/dashboard/charts";
import { CommuneEvolutionTable } from "@/components/dashboard/commune-evolution";
import { FocusCommune } from "@/components/dashboard/focus-commune";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, SlidersHorizontal } from "lucide-react";
import { NavHeader } from "@/components/nav-header";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme-toggle";
import { useState } from "react";

const CommunePicker = dynamic(
  () => import("@/components/map/commune-picker").then((mod) => mod.CommunePicker),
  { ssr: false }
);
const DvfHeatmap = dynamic(
  () => import("@/components/map/dvf-heatmap").then((mod) => mod.DvfHeatmap),
  { ssr: false, loading: () => <MapSkeleton /> }
);

function MobileFiltersSheet({
  filters,
  onFilterChange,
  communes,
}: {
  filters: Filters;
  onFilterChange: (f: Filters) => void;
  communes: string[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="sm:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium bg-muted hover:bg-accent transition-colors">
          <SlidersHorizontal className="h-4 w-4" />
          Filtres
        </SheetTrigger>
        <SheetContent side="right" className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Filtres</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-3 mt-2">
            <FiltersBarTerrain
              filters={filters}
              onFilterChange={onFilterChange}
              communes={communes}
              vertical
            />
          </div>
          <div className="mt-6 pt-4 border-t">
            <ThemeToggle />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

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
      <NavHeader />

      <div className="container mx-auto px-4 py-4 space-y-4">
        <div className="hidden sm:block">
          <FiltersBarTerrain
            filters={filters}
            onFilterChange={setFilters}
            communes={communes}
          />
        </div>

        <MobileFiltersSheet
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

            <PriceByCommuneChart data={timeSeriesByCommune} topN={5} />

            <CommunePrixMedianChart data={communeStats} />
          </TabsContent>

          <TabsContent value="communes" className="mt-4 space-y-4">
            <CommunePicker
              selected={filters.communes}
              onChange={(v) => setFilters({ ...filters, communes: v })}
              departements={filters.departements}
            />

            <CommuneEvolutionTable
              data={timeSeriesByCommune}
              communeStats={communeStats}
              onCommuneClick={setFocusCommune}
            />

            <FocusCommune
              commune={focusCommune}
              crosstab={crosstab}
              transactions={transactions}
              onClose={() => setFocusCommune(null)}
              showCrosstab={false}
            />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
