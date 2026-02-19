import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopNavbar } from "@/components/layout/TopNavbar";
import { AuthProvider, useAuth } from "@/hooks/use-auth";

const Index = lazy(() => import("./pages/Index"));
const Designer = lazy(() => import("./pages/Designer"));
const Tasks = lazy(() => import("./pages/Tasks"));
const Instances = lazy(() => import("./pages/Instances"));
const Admin = lazy(() => import("./pages/Admin"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Auth = lazy(() => import("./pages/Auth"));

const queryClient = new QueryClient();

function ProtectedApp() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex flex-1 flex-col overflow-hidden">
        <TopNavbar />
        <div className="flex-1 overflow-hidden">
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/designer" element={<Designer />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/instances" element={<Instances />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<div className="flex h-screen items-center justify-center text-sm text-muted-foreground">Loading...</div>}>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/*" element={<ProtectedApp />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
