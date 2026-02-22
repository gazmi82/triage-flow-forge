import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Sidebar, TopNavbar } from "@/components/layout";
import { useAuth } from "@/hooks";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { bootstrapWorkflowThunk } from "@/store/slices";
import { getDefaultRouteForRole, isAdminRole } from "@/lib";
import { appQueryClient } from "@/data/queryClient";

const Index = lazy(() => import("./pages/Index.tsx"));
const Designer = lazy(() => import("./pages/Designer"));
const Tasks = lazy(() => import("./pages/Tasks"));
const Draft = lazy(() => import("./pages/Draft"));
const SavedTasks = lazy(() => import("./pages/SavedTasks"));
const Instances = lazy(() => import("./pages/Instances"));
const Admin = lazy(() => import("./pages/Admin"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Auth = lazy(() => import("./pages/Auth"));

function ProtectedApp() {
  const dispatch = useAppDispatch();
  const { isAuthenticated, user } = useAuth();
  const { isLoading, hasBootstrapped } = useAppSelector((state) => state.workflow);

  useEffect(() => {
    if (isAuthenticated && !hasBootstrapped && !isLoading) {
      dispatch(bootstrapWorkflowThunk());
    }
  }, [dispatch, hasBootstrapped, isAuthenticated, isLoading]);

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  const isAdmin = isAdminRole(user?.role);
  const defaultRoute = getDefaultRouteForRole(user?.role);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex flex-1 flex-col overflow-hidden">
        <TopNavbar />
        {isLoading ? (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">Loading data...</div>
        ) : (
          <div className="flex-1 overflow-hidden">
            <Routes>
              {isAdmin ? (
                <>
                  <Route path="/" element={<Index />} />
                  <Route path="/designer" element={<Designer />} />
                  <Route path="/tasks" element={<Tasks />} />
                  <Route path="/draft" element={<Draft />} />
                  <Route path="/saved-tasks" element={<SavedTasks />} />
                  <Route path="/instances" element={<Instances />} />
                  <Route path="/admin" element={<Admin />} />
                  <Route path="*" element={<NotFound />} />
                </>
              ) : (
                <>
                  <Route path="/" element={<Navigate to={defaultRoute} replace />} />
                  <Route path="/designer" element={<Designer />} />
                  <Route path="/tasks" element={<Tasks />} />
                  <Route path="/draft" element={<Draft />} />
                  <Route path="/saved-tasks" element={<SavedTasks />} />
                  <Route path="*" element={<Navigate to={defaultRoute} replace />} />
                </>
              )}
            </Routes>
          </div>
        )}
      </main>
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={appQueryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<div className="flex h-screen items-center justify-center text-sm text-muted-foreground">Loading...</div>}>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/*" element={<ProtectedApp />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
