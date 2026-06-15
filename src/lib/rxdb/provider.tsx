import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { getDatabase, destroyDatabase, type AppDatabase } from "./database";
import { startReplication, type ReplicationManager } from "./replication";
import { useAuth } from "@/hooks/use-auth";

type Ctx = {
  db: AppDatabase | null;
  ready: boolean;
  online: boolean;
  syncing: boolean;
  pendingPush: number;
};

const RxCtx = createContext<Ctx>({
  db: null,
  ready: false,
  online: true,
  syncing: false,
  pendingPush: 0,
});

export function RxDBProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [db, setDb] = useState<AppDatabase | null>(null);
  const [ready, setReady] = useState(false);
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [syncing, setSyncing] = useState(false);
  const [pendingPush, setPendingPush] = useState(0);
  const managerRef = useRef<ReplicationManager | null>(null);

  // Bring up the local DB once. Survives logouts.
  useEffect(() => {
    let cancelled = false;
    getDatabase().then((d) => {
      if (!cancelled) {
        setDb(d);
        setReady(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Start / stop replication with auth state.
  useEffect(() => {
    if (!db) return;
    let stopped = false;
    if (user) {
      startReplication(db).then((mgr) => {
        if (stopped) {
          mgr.stop();
          return;
        }
        managerRef.current = mgr;

        // Wire active state from all replication states.
        const subs: Array<{ unsubscribe: () => void }> = [];
        const recomputeSync = () => {
          let active = 0;
          let pending = 0;
          for (const [, rep] of mgr.states) {
            if ((rep as any).active$?.getValue?.()) active++;
          }
          setSyncing(active > 0);
          setPendingPush(pending);
        };
        for (const [, rep] of mgr.states) {
          subs.push(rep.active$.subscribe(recomputeSync));
        }
        return () => subs.forEach((s) => s.unsubscribe());
      });
    }
    return () => {
      stopped = true;
      const mgr = managerRef.current;
      if (mgr) {
        mgr.stop();
        managerRef.current = null;
      }
      setSyncing(false);
    };
  }, [db, user?.id]);

  // Track connectivity. When we come back online, force resync.
  useEffect(() => {
    const onOnline = () => {
      setOnline(true);
      const mgr = managerRef.current;
      if (mgr) for (const [, rep] of mgr.states) rep.reSync();
    };
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const value = useMemo<Ctx>(
    () => ({ db, ready, online, syncing, pendingPush }),
    [db, ready, online, syncing, pendingPush],
  );
  return <RxCtx.Provider value={value}>{children}</RxCtx.Provider>;
}

export function useRxDB() {
  return useContext(RxCtx);
}

export async function wipeLocalDB() {
  await destroyDatabase();
}
