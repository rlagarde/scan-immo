"use client";

import dynamic from "next/dynamic";
import { useDvf, type Filters, DEFAULT_FILTERS } from "@/hooks/use-dvf";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { FiltersBar } from "@/components/dashboard/filters-bar";
import {
  TransactionsByTypeChart,
  PriceM2ByTypeChart,
  TransactionsByPiecesChart,
  PriceByPiecesChart,
  PriceDistributionChart,
  PriceByCommuneChart,
} from "@/components/dashboard/charts";
import { CommuneEvolutionTable } from "@/components/dashboard/commune-evolution";
import { FocusCommune } from "@/components/dashboard/focus-commune";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, SlidersHorizontal, MapPin, TrendingUp, Building2 } from "lucide-react";
import { NavHeader, NavLinks } from "@/components/nav-header";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme-toggle";
import { useState } from "react";
import { cn } from "@/lib/utils";

// Dynamic imports for maps (no SSR - maplibre needs window)
const CommunePicker = dynamic(
  () => import("@/components/map/commune-picker").then((mod) => mod.CommunePicker),
  { ssr: false }
);
const DvfMap = dynamic(
  () => import("@/components/map/dvf-map").then((mod) => mod.DvfMap),
  { ssr: false, loading: () => <MapSkeleton /> }
);

const HABITATION_FILTERS: Filters = {
  ...DEFAULT_FILTERS,
  typesLocal: ["Maison", "Appartement"],
};

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
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="flex items-center justify-center rounded border h-[34px] w-[34px] bg-muted hover:bg-accent transition-colors shrink-0">
        <SlidersHorizontal className="h-4 w-4" />
      </SheetTrigger>
        <SheetContent side="right" className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Filtres</SheetTitle>
          </SheetHeader>
          <NavLinks />
          <div className="flex flex-col gap-3 mt-2">
            <FiltersBar
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
  );
}

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

  const [tab, setTab] = useState("carte");

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
    <main className="min-h-screen bg-background pb-16 sm:pb-0">
      {/* Desktop: sticky header + filters + tabs */}
      <div className="hidden sm:block sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b">
        <NavHeader />
        <div className="container mx-auto px-4 py-2 space-y-2">
          <FiltersBar
            filters={filters}
            onFilterChange={setFilters}
            communes={communes}
          />
          <nav className="flex rounded-md border bg-muted p-0.5 gap-0.5 w-fit">
            {[
              { value: "carte", label: "Carte", icon: MapPin },
              { value: "prix", label: "Prix", icon: TrendingUp },
              { value: "communes", label: "Communes", icon: Building2 },
            ].map((t) => (
              <button
                key={t.value}
                onClick={() => setTab(t.value)}
                className={cn(
                  "flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium transition-colors",
                  tab === t.value
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-background"
                )}
              >
                <t.icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Mobile: sticky header with filters button inline */}
      <div className="sm:hidden sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b">
        <NavHeader
          trailing={
            <MobileFiltersSheet
              filters={filters}
              onFilterChange={setFilters}
              communes={communes}
            />
          }
        />
      </div>

      <div className="container mx-auto px-4 py-4 space-y-4">

        <KpiCards data={kpis} />

        <Tabs value={tab} onValueChange={setTab} className="w-full">

          <TabsContent value="carte" className="mt-4">
            <DvfMap points={mapPoints} />
          </TabsContent>

          <TabsContent value="prix" className="mt-4 space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <TransactionsByTypeChart data={timeSeriesByType} />
              <PriceM2ByTypeChart data={timeSeriesByType} />
              <TransactionsByPiecesChart data={timeSeriesByPieces} />
              <PriceByPiecesChart data={timeSeriesByPieces} />
              <PriceByCommuneChart data={timeSeriesByCommune} topN={10} />
              <PriceDistributionChart data={priceDistribution} />
            </div>
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
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Mobile: bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur-sm sm:hidden">
        <div className="flex">
          {[
            { value: "carte", label: "Carte", icon: MapPin },
            { value: "prix", label: "Prix", icon: TrendingUp },
            { value: "communes", label: "Communes", icon: Building2 },
          ].map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={cn(
                "flex-1 flex flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors",
                tab === t.value
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              <t.icon className="h-5 w-5" />
              {t.label}
            </button>
          ))}
        </div>
      </nav>
    </main>
  );
}
