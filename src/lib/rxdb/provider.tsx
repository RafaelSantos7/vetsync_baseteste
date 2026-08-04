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
  /** false while the first Supabase -> RxDB pull is still running */
  initialSyncDone: boolean;
};

const RxCtx = createContext<Ctx>({ db: null, ready: false, online: true, syncing: false, pendingPush: 0, initialSyncDone: false });

export function RxDBProvider({ children }: { children: React.ReactNode }) {
  const { user, organizationId } = useAuth();
  const [db, setDb] = useState<AppDatabase | null>(null);
  const [ready, setReady] = useState(false);
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [syncing, setSyncing] = useState(false);
  const [pendingPush, setPendingPush] = useState(0);
  const [initialSyncDone, setInitialSyncDone] = useState(false);
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
    return () => { cancelled = true; };
  }, []);

  // Start / stop replication with auth state.
  useEffect(() => {
    if (!db) return;
    let stopped = false;
    if (user && organizationId) {
      setInitialSyncDone(false);
      startReplication(db, organizationId).then((mgr) => {
        if (stopped) { mgr.stop(); return; }
        managerRef.current = mgr;
        mgr.initialSync.then(() => { if (!stopped) setInitialSyncDone(true); });

        // Wire active state from all replication states.
        const subs: Array<{ unsubscribe: () => void }> = [];
        const recomputeSync = () => {
          let active = 0; let pending = 0;
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
    } else {
      setInitialSyncDone(true);
    }
    return () => {
      stopped = true;
      const mgr = managerRef.current;
      if (mgr) { mgr.stop(); managerRef.current = null; }
      setSyncing(false);
    };
  }, [db, user?.id, organizationId]);


  // Track connectivity. When we come back online, force resync.
  useEffect(() => {
    const onOnline = () => {
      setOnline(true);
      const mgr = managerRef.current;
      if (mgr) for (const [, rep] of mgr.states) rep.reSync();
      // Flush appointments that failed to reach Google Calendar while offline.
      import("@/lib/google-calendar").then((m) => m.syncPendingAppointments()).catch(() => {});
    };
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const value = useMemo<Ctx>(() => ({ db, ready, online, syncing, pendingPush, initialSyncDone }), [db, ready, online, syncing, pendingPush, initialSyncDone]);
  return <RxCtx.Provider value={value}>{children}</RxCtx.Provider>;
}

export function useRxDB() {
  return useContext(RxCtx);
}

export async function wipeLocalDB() {
  await destroyDatabase();
}
