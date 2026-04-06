"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MultiSelect } from "@/components/ui/multi-select";
import { YearRangePicker } from "@/components/ui/year-range-picker";
import { Checkbox } from "@/components/ui/checkbox";
import type { Filters } from "@/hooks/use-dvf";

interface FiltersBarProps {
  filters: Filters;
  onFilterChange: (filters: Filters) => void;
  communes: string[];
  vertical?: boolean;
}

const YEARS = [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];

const DEPARTEMENT_OPTIONS = [
  { value: "40", label: "40 — Landes" },
  { value: "64", label: "64 — Pyrénées-Atl." },
];

const TYPE_OPTIONS = [
  { value: "Maison", label: "Maison" },
  { value: "Appartement", label: "Appartement" },
];

const PIECES_OPTIONS = [
  { value: "1", label: "1 pièce" },
  { value: "2", label: "2 pièces" },
  { value: "3", label: "3 pièces" },
  { value: "4", label: "4 pièces" },
  { value: "5", label: "5 pièces" },
  { value: "6", label: "6+ pièces" },
];

export function FiltersBar({
  filters,
  onFilterChange,
  communes,
  vertical,
}: FiltersBarProps) {
  const update = (partial: Partial<Filters>) =>
    onFilterChange({ ...filters, ...partial });

  const communeOptions = communes.map((c) => ({ value: c, label: c }));

  return (
    <div className={vertical ? "flex flex-col gap-3" : "flex flex-wrap gap-2 items-center"}>
      <MultiSelect
        options={DEPARTEMENT_OPTIONS}
        selected={filters.departements}
        onChange={(v) => update({ departements: v, communes: [] })}
        placeholder="Département"
      />

      <MultiSelect
        options={communeOptions}
        selected={filters.communes}
        onChange={(v) => update({ communes: v })}
        placeholder="Commune"
      />

      <YearRangePicker
        min={filters.anneeMin}
        max={filters.anneeMax}
        years={YEARS}
        onChange={update}
      />

      <MultiSelect
        options={TYPE_OPTIONS}
        selected={filters.typesLocal}
        onChange={(v) => update({ typesLocal: v })}
        placeholder="Type de bien"
      />

      <MultiSelect
        options={PIECES_OPTIONS}
        selected={filters.pieces.map(String)}
        onChange={(v) => update({ pieces: v.map(Number) })}
        placeholder="Pièces"
      />

      <label className="flex items-center gap-2 cursor-pointer self-center">
        <Checkbox
          checked={filters.venteSimple}
          onCheckedChange={(checked) => update({ venteSimple: !!checked })}
        />
        <span className="text-xs text-muted-foreground">Exclure ventes multiples</span>
      </label>
    </div>
  );
}

const SURFACE_TERRAIN_OPTIONS = [
  { value: "", label: "Surface: sans limite" },
  { value: "1000", label: "≤ 1 000 m²" },
  { value: "2000", label: "≤ 2 000 m²" },
  { value: "5000", label: "≤ 5 000 m²" },
  { value: "10000", label: "≤ 10 000 m²" },
];

const NATURE_CULTURE_OPTIONS = [
  { value: "sols", label: "Sols" },
  { value: "terrains a b\u00e2tir", label: "Terrains \u00e0 b\u00e2tir" },
  { value: "jardins", label: "Jardins" },
  { value: "terrains d'agr\u00e9ment", label: "Terrains d'agr\u00e9ment" },
  { value: "terres", label: "Terres agricoles" },
  { value: "pr\u00e9s", label: "Pr\u00e9s" },
  { value: "landes", label: "Landes" },
  { value: "vignes", label: "Vignes" },
  { value: "vergers", label: "Vergers" },
  { value: "bois", label: "Bois / For\u00eat" },
];

export function FiltersBarTerrain({
  filters,
  onFilterChange,
  communes,
  vertical,
}: FiltersBarProps) {
  const update = (partial: Partial<Filters>) =>
    onFilterChange({ ...filters, ...partial });

  const communeOptions = communes.map((c) => ({ value: c, label: c }));

  return (
    <div className={vertical ? "flex flex-col gap-3" : "flex flex-wrap gap-2 items-center"}>
      <MultiSelect
        options={DEPARTEMENT_OPTIONS}
        selected={filters.departements}
        onChange={(v) => update({ departements: v, communes: [] })}
        placeholder="Département"
      />

      <MultiSelect
        options={communeOptions}
        selected={filters.communes}
        onChange={(v) => update({ communes: v })}
        placeholder="Commune"
      />

      <YearRangePicker
        min={filters.anneeMin}
        max={filters.anneeMax}
        years={YEARS}
        onChange={update}
      />

      <MultiSelect
        options={NATURE_CULTURE_OPTIONS}
        selected={filters.natureCultures}
        onChange={(v) => update({ natureCultures: v })}
        placeholder="Nature du terrain"
      />

      <Select
        value={filters.surfaceTerrainMax != null ? String(filters.surfaceTerrainMax) : ""}
        onValueChange={(v) => update({ surfaceTerrainMax: v ? Number(v) : null })}
      >
        <SelectTrigger className="w-[160px] h-9">
          <SelectValue placeholder="Surface max" />
        </SelectTrigger>
        <SelectContent>
          {SURFACE_TERRAIN_OPTIONS.map((o) => (
            <SelectItem key={o.value || "none"} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
