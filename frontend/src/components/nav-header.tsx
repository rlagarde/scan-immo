"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { Home, TreePine } from "lucide-react";

const LINKS = [
  { href: "/", label: "Habitations", icon: Home },
  { href: "/terrains", label: "Terrains", icon: TreePine },
] as const;

export function NavHeader({ trailing }: { trailing?: React.ReactNode } = {}) {
  const pathname = usePathname();

  return (
    <header className="bg-card sm:border-b">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold whitespace-nowrap">scan-immo</h1>
          {/* Desktop: nav inline */}
          <nav className="hidden sm:flex rounded-md border bg-muted p-0.5 gap-0.5">
            {LINKS.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-background"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground hidden sm:block">
            Gironde (33), Landes (40) & Pyrénées-Atl. (64)
          </span>
          <div className="hidden sm:block">
            <ThemeToggle />
          </div>
          {trailing}
        </div>
      </div>
    </header>
  );
}

/** Nav links for use inside mobile Sheet */
export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex rounded-md border bg-muted p-0.5 gap-0.5 w-full">
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-background"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
