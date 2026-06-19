import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import { lazy, Suspense } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import { Loader2 } from "lucide-react";

// Lazy-load page components
const Home = lazy(() => import("./pages/Home"));
const Records = lazy(() => import("./pages/Records"));
const Players = lazy(() => import("./pages/Players"));
const Schedules = lazy(() => import("./pages/Schedules"));
const Exercises = lazy(() => import("./pages/Exercises"));
const NotFound = lazy(() => import("./pages/NotFound"));

function LoadingSpinner() {
  return (
    <div className="flex h-[50vh] w-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

function Router() {
  return (
    <DashboardLayout>
      <Suspense fallback={<LoadingSpinner />}>
        <Switch>
          <Route path={"/"} component={Home} />
          <Route path={"/records"} component={Records} />
          <Route path={"/players"} component={Players} />
          <Route path={"/schedules"} component={Schedules} />
          <Route path={"/exercises"} component={Exercises} />
          <Route path={"/404"} component={NotFound} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </DashboardLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
