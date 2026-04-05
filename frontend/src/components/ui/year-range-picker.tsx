"use client";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface YearRangePickerProps {
  min: number;
  max: number;
  years: number[];
  onChange: (partial: { anneeMin?: number; anneeMax?: number }) => void;
  className?: string;
}

export function YearRangePicker({
  min,
  max,
  years,
  onChange,
  className,
}: YearRangePickerProps) {
  const display = min === max ? `${min}` : `${min} – ${max}`;

  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          "flex items-center justify-between min-w-[120px] h-9 px-3 text-sm rounded-md border border-input bg-background hover:bg-accent/50 transition-colors",
          className
        )}
      >
        <span className="truncate text-left">{display}</span>
        <ChevronDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-3">
        <div className="flex gap-2 items-end">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">Depuis</span>
            <Select
              value={String(min)}
              onValueChange={(v) => {
                if (!v) return;
                const n = Number(v);
                onChange({ anneeMin: n, ...(n > max ? { anneeMax: n } : {}) });
              }}
            >
              <SelectTrigger className="w-[100px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
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
              value={String(max)}
              onValueChange={(v) => {
                if (!v) return;
                const n = Number(v);
                onChange({ anneeMax: n, ...(n < min ? { anneeMin: n } : {}) });
              }}
            >
              <SelectTrigger className="w-[100px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
