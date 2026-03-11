"use client";

import { useState, useRef, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  label?: string;
  className?: string;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Sélectionner...",
  label,
  className,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const allSelected = selected.length === 0 || selected.length === options.length;

  const selectAll = () => {
    onChange([]);
  };

  const displayText = allSelected
    ? placeholder
    : selected.length <= 2
      ? selected
          .map((v) => options.find((o) => o.value === v)?.label ?? v)
          .join(", ")
      : `${selected.length} sélectionnés`;

  return (
    <div className={cn("flex flex-col gap-1 relative", className)} ref={containerRef}>
      {label && (
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      )}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center justify-between min-w-[160px] h-9 px-3 text-sm rounded-md border border-input bg-background hover:bg-accent/50 transition-colors",
          open && "ring-1 ring-ring"
        )}
      >
        <span className="truncate text-left">
          {displayText}
        </span>
        <ChevronDown className={cn("ml-2 h-3 w-3 shrink-0 opacity-50 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 w-[220px] rounded-md border bg-popover p-1.5 shadow-md">
          {options.length > 6 && (
            <input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher..."
              className="w-full px-2 py-1.5 text-sm border rounded mb-1.5 bg-background outline-none focus:ring-1 focus:ring-ring"
            />
          )}
          <div className="max-h-[250px] overflow-y-auto space-y-0.5">
            <button
              type="button"
              className="flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded hover:bg-accent cursor-pointer"
              onClick={selectAll}
            >
              <span className={cn(
                "flex h-4 w-4 items-center justify-center rounded-sm border border-input shrink-0",
                allSelected && "bg-primary border-primary text-primary-foreground"
              )}>
                {allSelected && <Check className="h-3 w-3" />}
              </span>
              <span className="font-medium">Tout</span>
            </button>
            {filtered.map((option) => {
              const isChecked = selected.length === 0 || selected.includes(option.value);
              return (
                <button
                  type="button"
                  key={option.value}
                  className="flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded hover:bg-accent cursor-pointer"
                  onClick={() => toggle(option.value)}
                >
                  <span className={cn(
                    "flex h-4 w-4 items-center justify-center rounded-sm border border-input shrink-0",
                    isChecked && "bg-primary border-primary text-primary-foreground"
                  )}>
                    {isChecked && <Check className="h-3 w-3" />}
                  </span>
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {!allSelected && selected.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {selected.map((v) => (
            <Badge
              key={v}
              variant="secondary"
              className="text-xs gap-1 cursor-pointer"
              onClick={() => toggle(v)}
            >
              {options.find((o) => o.value === v)?.label ?? v}
              <X className="h-3 w-3" />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
