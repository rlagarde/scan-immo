"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MultiSelect } from "@/components/ui/multi-select";
import { Checkbox } from "@/components/ui/checkbox";
import type { Filters } from "@/hooks/use-dvf";

interface FiltersBarProps {
  filters: Filters;
  onFilterChange: (filters: Filters) => void;
  communes: string[];
}

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
}: FiltersBarProps) {
  const update = (partial: Partial<Filters>) =>
    onFilterChange({ ...filters, ...partial });

  const communeOptions = communes.map((c) => ({ value: c, label: c }));

  return (
    <div className="flex flex-wrap gap-4 items-end">
      <MultiSelect
        label="Département"
        options={DEPARTEMENT_OPTIONS}
        selected={filters.departements}
        onChange={(v) => update({ departements: v, communes: [] })}
        placeholder="Tous les départements"
      />

      <MultiSelect
        label="Type de bien"
        options={TYPE_OPTIONS}
        selected={filters.typesLocal}
        onChange={(v) => update({ typesLocal: v })}
        placeholder="Tous les types"
      />

      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-muted-foreground">Depuis</span>
        <Select
          value={String(filters.anneeMin)}
          onValueChange={(v) => v && update({ anneeMin: Number(v) })}
        >
          <SelectTrigger className="w-[100px] h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[2020, 2021, 2022, 2023, 2024, 2025].map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-muted-foreground">Jusqu&apos;à</span>
        <Select
          value={String(filters.anneeMax)}
          onValueChange={(v) => v && update({ anneeMax: Number(v) })}
        >
          <SelectTrigger className="w-[100px] h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[2020, 2021, 2022, 2023, 2024, 2025].map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <MultiSelect
        label="Pièces"
        options={PIECES_OPTIONS}
        selected={filters.pieces.map(String)}
        onChange={(v) => update({ pieces: v.map(Number) })}
        placeholder="Toutes"
      />

      <MultiSelect
        label="Commune"
        options={communeOptions}
        selected={filters.communes}
        onChange={(v) => update({ communes: v })}
        placeholder="Toutes les communes"
      />

      <label className="flex items-center gap-2 cursor-pointer self-center pb-1">
        <Checkbox
          checked={filters.venteSimple}
          onCheckedChange={(checked) => update({ venteSimple: !!checked })}
        />
        <span className="text-xs text-muted-foreground">Exclure ventes multiples (promoteur)</span>
      </label>
    </div>
  );
}

const SURFACE_TERRAIN_OPTIONS = [
  { value: "", label: "Sans limite" },
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
}: FiltersBarProps) {
  const update = (partial: Partial<Filters>) =>
    onFilterChange({ ...filters, ...partial });

  const communeOptions = communes.map((c) => ({ value: c, label: c }));

  return (
    <div className="flex flex-wrap gap-4 items-end">
      <MultiSelect
        label="Département"
        options={DEPARTEMENT_OPTIONS}
        selected={filters.departements}
        onChange={(v) => update({ departements: v, communes: [] })}
        placeholder="Tous les départements"
      />

      <MultiSelect
        label="Nature du terrain"
        options={NATURE_CULTURE_OPTIONS}
        selected={filters.natureCultures}
        onChange={(v) => update({ natureCultures: v })}
        placeholder="Toutes natures"
      />

      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-muted-foreground">Surface max</span>
        <Select
          value={filters.surfaceTerrainMax != null ? String(filters.surfaceTerrainMax) : ""}
          onValueChange={(v) => update({ surfaceTerrainMax: v ? Number(v) : null })}
        >
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue />
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

      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-muted-foreground">Depuis</span>
        <Select
          value={String(filters.anneeMin)}
          onValueChange={(v) => v && update({ anneeMin: Number(v) })}
        >
          <SelectTrigger className="w-[100px] h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[2020, 2021, 2022, 2023, 2024, 2025].map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-muted-foreground">Jusqu&apos;à</span>
        <Select
          value={String(filters.anneeMax)}
          onValueChange={(v) => v && update({ anneeMax: Number(v) })}
        >
          <SelectTrigger className="w-[100px] h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[2020, 2021, 2022, 2023, 2024, 2025].map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <MultiSelect
        label="Commune"
        options={communeOptions}
        selected={filters.communes}
        onChange={(v) => update({ communes: v })}
        placeholder="Toutes les communes"
      />
    </div>
  );
}
