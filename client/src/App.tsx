import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import { lazy, Suspense } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AppModeProvider } from "./contexts/AppModeContext";
import DashboardLayout from "./components/DashboardLayout";
import { Loader2 } from "lucide-react";

// Lazy-load page components
const Home = lazy(() => import("./pages/Home"));
const Records = lazy(() => import("./pages/Records"));
const Players = lazy(() => import("./pages/Players"));
const Schedules = lazy(() => import("./pages/Schedules"));
const Exercises = lazy(() => import("./pages/Exercises"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Training App page components
const TrainingDashboard = lazy(() => import("./pages/training/Dashboard"));
const Athletes = lazy(() => import("./pages/training/Athletes"));
const AthleteDetail = lazy(() => import("./pages/training/AthleteDetail"));
const Programs = lazy(() => import("./pages/training/Programs"));
const ProgramDetail = lazy(() => import("./pages/training/ProgramDetail"));
const ProgramCreate = lazy(() => import("./pages/training/ProgramCreate"));
const ProgramEdit = lazy(() => import("./pages/training/ProgramEdit"));
const ProgramPrint = lazy(() => import("./pages/training/ProgramPrint"));
const ProgramImport = lazy(() => import("./pages/training/ProgramImport"));
const ProgramImportConfirm = lazy(() => import("./pages/training/ProgramImportConfirm"));
const TrainingRecords = lazy(() => import("./pages/training/Records"));
const PhotoOCR = lazy(() => import("./pages/training/PhotoOCR"));
const ExerciseMaster = lazy(() => import("./pages/training/ExerciseMaster"));
const BatchPrint = lazy(() => import("./pages/training/BatchPrint"));
const UserApproval = lazy(() => import("./pages/training/UserApproval"));
const PendingApproval = lazy(() => import("./pages/training/PendingApproval"));

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
          {/* Treatment Routes */}
          <Route path={"/"} component={Home} />
          <Route path={"/records"} component={Records} />
          <Route path={"/players"} component={Players} />
          <Route path={"/schedules"} component={Schedules} />
          <Route path={"/exercises"} component={Exercises} />

          {/* Training Routes */}
          <Route path={"/training/dashboard"} component={TrainingDashboard} />
          <Route path={"/training/athletes"} component={Athletes} />
          <Route path={"/training/athletes/:id"} component={AthleteDetail} />
          <Route path={"/training/programs"} component={Programs} />
          <Route path={"/training/programs/create"} component={ProgramCreate} />
          <Route path={"/training/programs/import"} component={ProgramImport} />
          <Route path={"/training/programs/import/confirm"} component={ProgramImportConfirm} />
          <Route path={"/training/programs/:id"} component={ProgramDetail} />
          <Route path={"/training/programs/:id/edit"} component={ProgramEdit} />
          <Route path={"/training/programs/:id/print"} component={ProgramPrint} />
          <Route path={"/training/records"} component={TrainingRecords} />
          <Route path={"/training/ocr"} component={PhotoOCR} />
          <Route path={"/training/exercise-master"} component={ExerciseMaster} />
          <Route path={"/training/batch-print"} component={BatchPrint} />
          <Route path={"/training/approvals"} component={UserApproval} />
          <Route path={"/training/pending-approval"} component={PendingApproval} />

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
      <AppModeProvider>
        <ThemeProvider defaultTheme="light">
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </ThemeProvider>
      </AppModeProvider>
    </ErrorBoundary>
  );
}

export default App;
