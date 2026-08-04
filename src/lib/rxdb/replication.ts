import { replicateRxCollection, type RxReplicationState } from "rxdb/plugins/replication";
import type { RxCollection } from "rxdb";
import { supabase } from "@/integrations/supabase/client";
import { COLLECTION_NAMES, type CollectionName } from "./schemas";
import type { AppDatabase } from "./database";

type Checkpoint = { updated_at: string; id: string } | null | undefined;

const BATCH_SIZE = 200;
const DEV = import.meta.env.DEV;

/**
 * Collections that must NOT be replicated:
 * - organizations / organization_members: no `deleted` and no `organization_id` column,
 *   so the generic query below produced HTTP 400/404 responses from PostgREST.
 * - google_calendar_configs: OAuth tokens live server-side only (never in IndexedDB).
 */
const NOT_SYNCED: CollectionName[] = [
  "organizations",
  "organization_members",
  "google_calendar_configs",
];

export const SYNCED_COLLECTIONS = COLLECTION_NAMES.filter((n) => !NOT_SYNCED.includes(n));

function logDev(payload: Record<string, unknown>) {
  if (DEV) console.info("[rxdb:replication]", payload);
}

function buildReplication(
  collection: RxCollection<any>,
  table: CollectionName,
  organizationId: string,
  onFirstPull: () => void
): RxReplicationState<any, any> {
  let firstPullDone = false;

  return replicateRxCollection<any, any>({
    collection,
    replicationIdentifier: `supabase-${table}-${organizationId}`,
    deletedField: "deleted",
    retryTime: 5_000,
    autoStart: true,
    pull: {
      batchSize: BATCH_SIZE,
      async handler(lastCheckpoint: Checkpoint) {
        let q = supabase
          .from(table as any)
          .select("*")
          .eq("deleted", false)
          .eq("organization_id", organizationId)
          .order("updated_at", { ascending: true })
          .order("id", { ascending: true })
          .limit(BATCH_SIZE);

        if (lastCheckpoint) {
          q = q.or(
            `updated_at.gt.${lastCheckpoint.updated_at},and(updated_at.eq.${lastCheckpoint.updated_at},id.gt.${lastCheckpoint.id})`,
          );
        }

        const { data, error, status } = await q;
        if (error) {
          logDev({
            phase: "pull",
            collection: table,
            remoteTable: table,
            endpoint: `/rest/v1/${table}`,
            organizationId,
            httpStatus: status,
            response: error,
          });
          console.error(`[rxdb] pull error ${table} (HTTP ${status}):`, error.message);
          throw error;
        }

        const raw = (data ?? []) as any[];
        const docs = raw.map((d) => ({ ...d, is_deleted: !!d.deleted }));
        const last = raw.length ? raw[raw.length - 1] : null;
        const newCheckpoint: Checkpoint = last
          ? { updated_at: last.updated_at, id: last.id }
          : lastCheckpoint;

        logDev({ phase: "pull", collection: table, organizationId, pulled: docs.length });

        if (!firstPullDone && raw.length < BATCH_SIZE) {
          firstPullDone = true;
          onFirstPull();
        }

        return { documents: docs, checkpoint: newCheckpoint };
      },
    },
    push: {
      batchSize: 50,
      async handler(rows) {
        const payloads = rows.map((r) => {
          const doc = { ...r.newDocumentState } as any;
          doc.organization_id = organizationId;
          // Map local `is_deleted` back to the Supabase `deleted` column.
          doc.deleted = doc.deleted ?? !!doc.is_deleted;
          delete doc.is_deleted;

          // RxDB-only fields
          delete doc._deleted;
          delete doc._meta;
          delete doc._rev;
          delete doc._attachments;
          return doc;
        });

        const { error, status } = await supabase
          .from(table as any)
          .upsert(payloads, { onConflict: "id" });

        if (error) {
          logDev({
            phase: "push",
            collection: table,
            remoteTable: table,
            endpoint: `/rest/v1/${table}`,
            organizationId,
            httpStatus: status,
            response: error,
          });
          console.error(`[rxdb] push error ${table} (HTTP ${status}):`, error.message);
          throw error;
        }
        return [];
      },
    },
  });
}

export type ReplicationManager = {
  states: Map<CollectionName, RxReplicationState<any, any>>;
  /** Resolves once every synced collection finished its first pull from Supabase. */
  initialSync: Promise<void>;
  stop: () => Promise<void>;
};

export async function startReplication(db: AppDatabase, organizationId: string): Promise<ReplicationManager> {
  const states = new Map<CollectionName, RxReplicationState<any, any>>();

  let remaining = SYNCED_COLLECTIONS.length;
  let resolveInitial: () => void = () => {};
  const initialSync = new Promise<void>((res) => { resolveInitial = res; });
  const markDone = () => {
    remaining -= 1;
    if (remaining <= 0) resolveInitial();
  };

  for (const name of SYNCED_COLLECTIONS) {
    const rep = buildReplication(db.collections[name], name, organizationId, markDone);
    states.set(name, rep);

    const channel = supabase
      .channel(`rxdb-${name}-${organizationId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: name,
        filter: `organization_id=eq.${organizationId}`
      }, () => {
        rep.reSync();
      })
      .subscribe();

    (rep as any).__channel = channel;
  }

  // Safety valve: never keep the UI in "syncing" forever.
  setTimeout(resolveInitial, 20_000);

  return {
    states,
    initialSync,
    async stop() {
      for (const [, rep] of states) {
        try { supabase.removeChannel((rep as any).__channel); } catch {}
        await rep.cancel();
      }
      states.clear();
    },
  };
}
