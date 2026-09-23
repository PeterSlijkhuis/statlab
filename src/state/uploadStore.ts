/**
 * Keeps a student's uploaded files in this browser's IndexedDB, so they are
 * still in R's data folder after a reload. localStorage would not do: it holds
 * strings of a few megabytes at most, and an upload can be 25 MB of binary.
 * Nothing here is ever sent anywhere.
 */
export type StoredFile = { name: string; bytes: Uint8Array; savedAt: number };

const DB_NAME = 'statlab-uploads';
const STORE = 'files';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available'));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'name' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function run<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const request = work(tx.objectStore(STORE));
      // Resolved on the transaction, not the request: a write is only durable once it commits.
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function saveStoredFile(name: string, bytes: Uint8Array): Promise<void> {
  const record: StoredFile = { name, bytes, savedAt: Date.now() };
  await run('readwrite', (store) => store.put(record));
}

export async function deleteStoredFile(name: string): Promise<void> {
  await run('readwrite', (store) => store.delete(name));
}

/** Oldest first, so the list on the page keeps the order the student uploaded in. */
export async function loadStoredFiles(): Promise<StoredFile[]> {
  const all = await run<StoredFile[]>('readonly', (store) => store.getAll());
  return all.sort((a, b) => a.savedAt - b.savedAt);
}
