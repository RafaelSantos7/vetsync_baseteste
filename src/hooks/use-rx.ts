import { useEffect, useState } from "react";
import type { MangoQuery, RxCollection } from "rxdb";
import { getDatabase } from "@/lib/rxdb/database";
import type { CollectionName } from "@/lib/rxdb/schemas";

/** Resolve a collection on demand. Use inside async actions (save/edit/delete). */
export async function getCollection(name: CollectionName): Promise<RxCollection<any>> {
  const db = await getDatabase();
  return db.collections[name];
}

export function useRxQuery<T = any>(
  collectionName: CollectionName,
  query: MangoQuery = {},
  deps: any[] = [],
): { data: T[]; isLoading: boolean; collection: RxCollection<any> | null } {
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [col, setCol] = useState<RxCollection<any> | null>(null);

  useEffect(() => {
    let cancelled = false;
    let sub: { unsubscribe: () => void } | null = null;
    (async () => {
      try {
        const c = await getCollection(collectionName);
        if (cancelled) return;
        setCol(c);
        const q = c.find(query);
        sub = q.$.subscribe((docs: any[]) => {
          setData(docs.map((d) => d.toJSON()));
          setLoading(false);
        });
      } catch (err) {
        console.error("[useRxQuery] failed:", err);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      sub?.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionName, ...deps]);

  return { data, isLoading, collection: col };
}

export function useRxCollection(name: CollectionName) {
  const [col, setCol] = useState<RxCollection<any> | null>(null);
  useEffect(() => {
    let cancelled = false;
    getCollection(name)
      .then((c) => { if (!cancelled) setCol(c); })
      .catch((err) => console.error("[useRxCollection] failed:", err));
    return () => { cancelled = true; };
  }, [name]);
  return col;
}

export function uuid(): string {
  return (globalThis.crypto?.randomUUID?.() ??
    Math.random().toString(36).slice(2) + Date.now().toString(36));
}

/** Strip RxDB internal fields from a JSON doc before persisting to forms. */
export function clean<T extends Record<string, any>>(d: T): T {
  const c: any = { ...d };
  delete c._deleted; delete c._meta; delete c._rev; delete c._attachments;
  return c;
}
