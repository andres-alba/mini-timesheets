import {
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";
import { RootLayout } from "./routes/RootLayout";
import { EmployeesPage } from "./routes/EmployeesPage";
import { TimeEntriesPage } from "./routes/TimeEntriesPage";
import { WeekPage } from "./routes/WeekPage";

const rootRoute = createRootRoute({ component: RootLayout });

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: "/employees" });
  },
});

const employeesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/employees",
  component: EmployeesPage,
});

const timeEntriesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/time-entries",
  component: TimeEntriesPage,
});

const weekRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/week",
  component: WeekPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  employeesRoute,
  timeEntriesRoute,
  weekRoute,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
