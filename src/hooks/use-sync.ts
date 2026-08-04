import { useRxDB } from "@/lib/rxdb/provider";

export function useSync() {
  const { syncing, online, pendingPush, initialSyncDone } = useRxDB();
  return { isSyncing: syncing, online, pendingPush, initialSyncDone };
}

export function useSyncOnReconnect() {
  return null;
}
