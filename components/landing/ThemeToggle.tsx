"use client";

import { Moon, Sun } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { THEME_STORAGE_KEY } from "@/lib/brand";

type Theme = "light" | "dark";

function readInitialTheme(): Theme {
  if (typeof window === "undefined") {
    return "dark";
  }

  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(readInitialTheme);

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    setTheme(nextTheme);
  }

  return (
    <Button
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      className="rounded-full"
      size="icon"
      variant="outline"
      onClick={toggleTheme}
    >
      {theme === "dark" ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
    </Button>
  );
}
