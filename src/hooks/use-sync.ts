import { useRxDB } from "@/lib/rxdb/provider";

export function useSync() {
  const { syncing, online, pendingPush } = useRxDB();
  return { isSyncing: syncing, online, pendingPush };
}

export function useSyncOnReconnect() {
  return null;
}
