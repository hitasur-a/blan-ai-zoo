// Fish Audio mp3 を IndexedDB にキャッシュ
// キー: SHA-1(`${voiceId}:${cleanText}`) の先 16 桁 (元 3d-dog mockup と同じ方式)
// 同じ第一文を 2 回目以降は瞬時に取り出して再生 → ユーザー体感大幅改善

const DB_NAME = "blan-tts-cache";
const STORE = "fish-mp3";
const DB_VERSION = 1;
const MAX_ENTRIES = 200;

async function hashId(text: string): Promise<string> {
  if (typeof crypto === "undefined" || !crypto.subtle) return text.slice(0, 16);
  const buf = new TextEncoder().encode(text);
  const hashBuf = await crypto.subtle.digest("SHA-1", buf);
  return Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16);
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("no indexedDB"));
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("savedAt", "savedAt");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getCachedTts(voiceId: string, text: string): Promise<Blob | null> {
  try {
    const id = await hashId(`${voiceId}:${text}`);
    const db = await openDb();
    return await new Promise<Blob | null>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const store = tx.objectStore(STORE);
      const req = store.get(id);
      req.onsuccess = () => {
        const rec = req.result as { id: string; blob: Blob } | undefined;
        resolve(rec?.blob ?? null);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function setCachedTts(voiceId: string, text: string, blob: Blob): Promise<void> {
  try {
    const id = await hashId(`${voiceId}:${text}`);
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      store.put({ id, blob, savedAt: Date.now() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    // 古いエントリを軽くプルーニング (>MAX_ENTRIES 件)
    void pruneOldest(db);
  } catch {
    // ignore (容量超過などはサイレントに失敗)
  }
}

async function pruneOldest(db: IDBDatabase): Promise<void> {
  try {
    const count = await new Promise<number>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    if (count <= MAX_ENTRIES) return;
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, "readwrite");
      const idx = tx.objectStore(STORE).index("savedAt");
      let deleted = 0;
      const toDelete = count - MAX_ENTRIES;
      idx.openCursor().onsuccess = (e) => {
        const cur = (e.target as IDBRequest).result as IDBCursorWithValue | null;
        if (cur && deleted < toDelete) {
          cur.delete();
          deleted++;
          cur.continue();
        }
      };
      tx.oncomplete = () => resolve();
    });
  } catch {
    // ignore
  }
}
