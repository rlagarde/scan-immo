"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle({ showLabel = false }: { showLabel?: boolean } = {}) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="w-8 h-8" />;

  const isDark = resolvedTheme === "dark";
  const Icon = isDark ? Moon : Sun;
  const label = isDark ? "Sombre" : "Clair";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium bg-muted hover:bg-accent transition-colors"
      title={`Thème : ${label}`}
    >
      <Icon className="h-4 w-4" />
      {showLabel ? <span>{label}</span> : <span className="hidden sm:inline">{label}</span>}
    </button>
  );
}
