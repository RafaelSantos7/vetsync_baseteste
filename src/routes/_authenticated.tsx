import { createFileRoute, Outlet, Navigate, useRouterState } from "@tanstack/react-router";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Topbar } from "@/components/topbar";
import { useAuth } from "@/hooks/use-auth";
import { RxDBProvider } from "@/lib/rxdb/provider";
import { canAccessModule } from "@/lib/permissions";
import { Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useEffect } from "react";

export const Route = createFileRoute("/_authenticated")({
  component: AuthLayout,
});

function AuthLayout() {
  const { user, loading, role, roleLoaded } = useAuth();
  const path = useRouterState({ select: (r) => r.location.pathname });
  const search = useRouterState({ select: (r) => r.location.searchStr });
  const resolving = loading || (!!user && !roleLoaded);
  // Aguarda o callback OAuth ser processado antes de qualquer redirecionamento
  const hasOAuthCallback = search.includes("code=") || search.includes("error=");
  const allowed = resolving ? true : canAccessModule(role, path);

  useEffect(() => {
    if (!allowed && !resolving) {
      toast.error("Você não possui permissão para acessar esta seção.", {
        icon: <AlertCircle className="h-4 w-4" />,
      });
    }
  }, [allowed, resolving]);

  if (resolving) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!user) return <Navigate to="/login" />;
  if (!allowed && !hasOAuthCallback) return <Navigate to="/dashboard" />;


  return (
    <RxDBProvider>
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-background">
          <AppSidebar />
          <SidebarInset className="flex flex-1 flex-col">
            <Topbar />
            <main className="flex-1 p-4 md:p-6">
              <Outlet />
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </RxDBProvider>
  );
}
