"use client";

import { Moon, Sun } from "lucide-react";
import { useState } from "react";

const STORAGE_KEY = "ms-theme";

type Theme = "light" | "dark";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(getCurrentTheme);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage unavailable (private mode): theme still applies to this view.
    }
    setTheme(next);
  };

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggle}
      aria-label={
        theme === "dark" ? "Switch to light theme" : "Switch to dark theme"
      }
    >
      {theme === "dark" ? (
        <Sun size={15} aria-hidden="true" />
      ) : (
        <Moon size={15} aria-hidden="true" />
      )}
      <span>{theme === "dark" ? "Daybreak" : "Night Frost"}</span>
    </button>
  );
}

function getCurrentTheme(): Theme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}
