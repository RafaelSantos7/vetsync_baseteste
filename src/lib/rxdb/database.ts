import { createRxDatabase, addRxPlugin, type RxDatabase, type RxCollection, type RxStorage } from "rxdb";
import { getRxStorageDexie } from "rxdb/plugins/storage-dexie";
import { RxDBUpdatePlugin } from "rxdb/plugins/update";
import { wrappedValidateAjvStorage } from "rxdb/plugins/validate-ajv";
import { SCHEMAS, COLLECTION_NAMES, type CollectionName } from "./schemas";

addRxPlugin(RxDBUpdatePlugin);

if (import.meta.env.DEV) {
  import("rxdb/plugins/dev-mode").then(({ RxDBDevModePlugin, disableWarnings }) => {
    addRxPlugin(RxDBDevModePlugin);
    disableWarnings?.();
  });
}

export type AppCollections = Record<CollectionName, RxCollection<any>>;
export type AppDatabase = RxDatabase<AppCollections>;

let dbPromise: Promise<AppDatabase> | null = null;

async function buildDatabase(): Promise<AppDatabase> {
  const storage: RxStorage<any, any> = import.meta.env.DEV
    ? wrappedValidateAjvStorage({ storage: getRxStorageDexie() })
    : getRxStorageDexie();
  const db = await createRxDatabase<AppCollections>({
    name: "vetsystempro",
    storage,
    multiInstance: true,
    eventReduce: true,
    closeDuplicates: true,
  });

  const collections = Object.fromEntries(
    COLLECTION_NAMES.map((n) => [n, { schema: SCHEMAS[n] as any }]),
  ) as any;
  await db.addCollections(collections);
  return db;
}

export function getDatabase(): Promise<AppDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      try {
        console.info("[rxdb] creating database…");
        const db = await buildDatabase();
        console.info("[rxdb] ready ✅");
        return db;
      } catch (err: any) {
        const code = err?.code || err?.parameters?.errors?.[0]?.code;
        const msg = String(err?.message || "");
        const isSchemaConflict =
          code === "DB6" || code === "DB9" || code === "COL17" ||
          /\bDB6\b|\bDB9\b|\bCOL17\b/.test(msg);
        if (isSchemaConflict) {
          console.warn("[rxdb] schema conflict — wiping local DB and recreating…", err);
          await wipeLocalIndexedDb();
          const db = await buildDatabase();
          console.info("[rxdb] ready (after reset) ✅");
          return db;
        }
        console.error("[rxdb] init FAILED:", err);
        dbPromise = null;
        throw err;
      }
    })();
  }
  return dbPromise;
}

async function wipeLocalIndexedDb() {
  const tryDelete = (name: string) =>
    new Promise<void>((res) => {
      try {
        const req = indexedDB.deleteDatabase(name);
        req.onsuccess = req.onerror = req.onblocked = () => res();
      } catch { res(); }
    });
  try {
    const list = (indexedDB as any).databases ? await (indexedDB as any).databases() : [];
    for (const d of list) {
      if (d?.name && d.name.includes("vetsystempro")) await tryDelete(d.name);
    }
  } catch {}
  await tryDelete("vetsystempro");
}

export async function resetLocalDatabase() {
  try {
    if (dbPromise) {
      const db = await dbPromise.catch(() => null);
      if (db) { try { await db.remove(); } catch {} }
    }
  } finally {
    dbPromise = null;
    await wipeLocalIndexedDb();
  }
}

export async function destroyDatabase() {
  if (!dbPromise) return;
  const db = await dbPromise;
  await db.remove();
  dbPromise = null;
}
