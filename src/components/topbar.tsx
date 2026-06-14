import { useEffect, useState } from "react";
import { Search, LogOut, RefreshCw, WifiOff } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { NotificationsBell } from "./notifications-bell";
import { GlobalSearch } from "./global-search";
import { useAuth } from "@/hooks/use-auth";
import { useSync } from "@/hooks/use-sync";
import { Button } from "@/components/ui/button";

export function Topbar() {
  const { user, signOut } = useAuth();
  const { isSyncing, online } = useSync();
  const [openSearch, setOpenSearch] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpenSearch((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/70 px-4 backdrop-blur">
      <SidebarTrigger />
      <button
        onClick={() => setOpenSearch(true)}
        className="hidden flex-1 max-w-md items-center gap-2 rounded-lg border border-input bg-input/40 px-3 py-1.5 text-sm text-muted-foreground transition hover:bg-input/60 md:flex"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Buscar clientes, animais, propriedades…</span>
        <kbd className="rounded border border-border bg-background/60 px-1.5 py-0.5 text-[10px] font-mono">⌘K</kbd>
      </button>
      <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpenSearch(true)} aria-label="Buscar">
        <Search className="h-4 w-4" />
      </Button>
      <div className="ml-auto flex items-center gap-2">
        {!online && (
          <div className="flex items-center gap-1 rounded-md bg-warning/15 px-2 py-1 text-[11px] font-medium text-warning">
            <WifiOff className="h-3 w-3" /> Offline
          </div>
        )}
        {online && isSyncing && (
          <div className="hidden items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary sm:flex">
            <RefreshCw className="h-3 w-3 animate-spin" /> Sincronizando
          </div>
        )}
        <NotificationsBell />
        <div className="hidden text-right text-xs leading-tight sm:block">
          <div className="font-medium">{user?.user_metadata?.full_name ?? user?.email}</div>
          <div className="text-muted-foreground">Veterinário</div>
        </div>
        <Button variant="ghost" size="icon" onClick={() => signOut()} aria-label="Sair">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
      <GlobalSearch open={openSearch} onOpenChange={setOpenSearch} />
    </header>
  );
}
