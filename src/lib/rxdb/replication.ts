import { replicateRxCollection, type RxReplicationState } from "rxdb/plugins/replication";
import type { RxCollection } from "rxdb";
import { supabase } from "@/integrations/supabase/client";
import { COLLECTION_NAMES, type CollectionName } from "./schemas";
import type { AppDatabase } from "./database";

type Checkpoint = { updated_at: string; id: string } | null | undefined;

const BATCH_SIZE = 200;

function buildReplication(
  collection: RxCollection<any>,
  table: CollectionName,
): RxReplicationState<any, any> {
  return replicateRxCollection<any, any>({
    collection,
    replicationIdentifier: `supabase-${table}`,
    deletedField: "is_deleted",
    retryTime: 5_000,
    autoStart: true,
    pull: {
      batchSize: BATCH_SIZE,
      async handler(lastCheckpoint: Checkpoint) {
        let q = supabase
          .from(table as any)
          .select("*")
          .order("updated_at", { ascending: true })
          .order("id", { ascending: true })
          .limit(BATCH_SIZE);

        if (lastCheckpoint) {
          // Rows newer than checkpoint, or same updated_at with greater id.
          q = q.or(
            `updated_at.gt.${lastCheckpoint.updated_at},and(updated_at.eq.${lastCheckpoint.updated_at},id.gt.${lastCheckpoint.id})`,
          );
        }

        const { data, error } = await q;
        if (error) throw error;
        const docs = (data ?? []) as any[];
        const last = docs.length ? docs[docs.length - 1] : null;
        const newCheckpoint: Checkpoint = last
          ? { updated_at: last.updated_at, id: last.id }
          : lastCheckpoint;
        return { documents: docs, checkpoint: newCheckpoint };
      },
    },
    push: {
      batchSize: 50,
      async handler(rows) {
        // Last-write-wins: send the new state as upsert. We don't surface conflicts.
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const payloads = rows.map((r) => {
          const doc = { ...r.newDocumentState } as any;
          if (!doc.owner_id && user) doc.owner_id = user.id;
          // RxDB-only fields
          delete doc._deleted;
          delete doc._meta;
          delete doc._rev;
          delete doc._attachments;
          return doc;
        });
        const { error } = await supabase.from(table as any).upsert(payloads, { onConflict: "id" });
        if (error) throw error;
        return [];
      },
    },
  });
}

export type ReplicationManager = {
  states: Map<CollectionName, RxReplicationState<any, any>>;
  stop: () => Promise<void>;
};

export async function startReplication(db: AppDatabase): Promise<ReplicationManager> {
  const states = new Map<CollectionName, RxReplicationState<any, any>>();

  for (const name of COLLECTION_NAMES) {
    const rep = buildReplication(db.collections[name], name);
    states.set(name, rep);

    // Realtime push from Supabase → trigger reSync so pull picks up changes.
    const channel = supabase
      .channel(`rxdb-${name}`)
      .on("postgres_changes", { event: "*", schema: "public", table: name }, () => {
        rep.reSync();
      })
      .subscribe();

    (rep as any).__channel = channel;
  }

  return {
    states,
    async stop() {
      for (const [, rep] of states) {
        try {
          supabase.removeChannel((rep as any).__channel);
        } catch {}
        await rep.cancel();
      }
      states.clear();
    },
  };
}
