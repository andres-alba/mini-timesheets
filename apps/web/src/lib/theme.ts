import { useEffect, useState } from "react";

/**
 * Light/dark theme, persisted to localStorage. Defaults to light; the initial
 * `dark` class is set by an inline script in index.html (before first paint) so
 * we only read the current state here and keep it in sync on toggle.
 */
export type Theme = "light" | "dark";

const STORAGE_KEY = "theme";

function currentTheme(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(currentTheme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* localStorage unavailable (e.g. private mode) — toggle still works in-session */
    }
  }, [theme]);

  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return { theme, toggle };
}
