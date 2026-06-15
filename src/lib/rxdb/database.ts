import {
  createRxDatabase,
  addRxPlugin,
  type RxDatabase,
  type RxCollection,
  type RxStorage,
} from "rxdb";
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

declare global {
  interface Window {
    __vetSystemRxDbPromise?: Promise<AppDatabase> | null;
  }
}

const DB_NAME = "vetsystempro3";

async function buildDatabase(): Promise<AppDatabase> {
  const storage: RxStorage<any, any> = import.meta.env.DEV
    ? wrappedValidateAjvStorage({ storage: getRxStorageDexie() })
    : getRxStorageDexie();

  const db = await createRxDatabase<AppCollections>({
    name: DB_NAME,
    storage,
    multiInstance: false,
    eventReduce: true,
    ignoreDuplicate: true,
  });

  const collections = Object.fromEntries(
    COLLECTION_NAMES.map((n) => [n, { schema: SCHEMAS[n] as any }]),
  ) as any;

  await db.addCollections(collections);
  return db;
}

export function getDatabase(): Promise<AppDatabase> {
  if (!window.__vetSystemRxDbPromise) {
    window.__vetSystemRxDbPromise = (async () => {
      console.info("[rxdb] creating database…");
      const db = await buildDatabase();
      console.info("[rxdb] ready ✅");
      return db;
    })();

    window.__vetSystemRxDbPromise.catch((err) => {
      console.error("[rxdb] init FAILED:", err);
      window.__vetSystemRxDbPromise = null;
    });
  }

  return window.__vetSystemRxDbPromise;
}

async function wipeLocalIndexedDb() {
  const tryDelete = (name: string) =>
    new Promise<void>((res) => {
      try {
        const req = indexedDB.deleteDatabase(name);
        req.onsuccess = req.onerror = req.onblocked = () => res();
      } catch {
        res();
      }
    });

  try {
    const list = (indexedDB as any).databases ? await (indexedDB as any).databases() : [];
    for (const d of list) {
      if (d?.name && d.name.includes("vetsystempro")) await tryDelete(d.name);
    }
  } catch {}

  await tryDelete("vetsystempro");
  await tryDelete("vetsystempro2");
  await tryDelete("vetsystempro3");
}

export async function resetLocalDatabase() {
  try {
    if (window.__vetSystemRxDbPromise) {
      const db = await window.__vetSystemRxDbPromise.catch(() => null);
      if (db) {
        try {
          await db.remove();
        } catch {}
      }
    }
  } finally {
    window.__vetSystemRxDbPromise = null;
    await wipeLocalIndexedDb();
  }
}

export async function destroyDatabase() {
  if (!window.__vetSystemRxDbPromise) return;

  const db = await window.__vetSystemRxDbPromise;
  await db.remove();
  window.__vetSystemRxDbPromise = null;
}
