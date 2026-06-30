"use client";

import { Aperture, Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PRODUCT_NAME } from "@/lib/brand";
import { navItems } from "@/lib/landing-content";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./ThemeToggle";

export function LandingNavigation() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background backdrop-blur">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8" aria-label="Main navigation">
        <Link className="inline-flex items-center gap-2 font-bold text-foreground" href="/">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Aperture className="h-4 w-4" aria-hidden="true" />
          </span>
          {PRODUCT_NAME}
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <a key={item.href} className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground" href={item.href}>
              {item.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
          <Button asChild>
            <Link href="/app">Plan a Launch</Link>
          </Button>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <Button
            aria-controls="mobile-navigation"
            aria-expanded={open}
            aria-label="Toggle navigation"
            size="icon"
            variant="outline"
            onClick={() => setOpen((current) => !current)}
          >
            {open ? <X className="h-4 w-4" aria-hidden="true" /> : <Menu className="h-4 w-4" aria-hidden="true" />}
          </Button>
        </div>
      </nav>

      <div id="mobile-navigation" className={cn("border-t border-border px-4 pb-4 md:hidden", open ? "block" : "hidden")}>
        <div className="mx-auto grid max-w-7xl gap-2 pt-3">
          {navItems.map((item) => (
            <a
              key={item.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              href={item.href}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </a>
          ))}
          <Button asChild className="mt-2">
            <Link href="/app">Plan a Launch</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
