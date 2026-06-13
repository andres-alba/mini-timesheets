import { Link, Outlet } from "@tanstack/react-router";
import { useTheme } from "../lib/theme";

const tabs = [
  { to: "/employees", label: "Employees" },
  { to: "/time-entries", label: "Time entries" },
  { to: "/week", label: "Weekly summary" },
] as const;

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-600 shadow-sm transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
    >
      {isDark ? "☀️ Light" : "🌙 Dark"}
    </button>
  );
}

export function RootLayout() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold tracking-tight">Mini Timesheets</h1>
          <ThemeToggle />
        </div>
        <nav className="mt-3 flex gap-1 rounded-lg bg-white p-1 shadow-sm dark:bg-slate-800">
          {tabs.map((t) => (
            <Link
              key={t.to}
              to={t.to}
              className="flex-1 rounded-md px-3 py-2 text-center text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
              activeProps={{
                className:
                  "bg-slate-900 text-white hover:bg-slate-700 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-slate-300",
              }}
            >
              {t.label}
            </Link>
          ))}
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
