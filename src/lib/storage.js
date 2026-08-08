/**
 * Two storage layers, on purpose:
 *
 *   localStorage  small JSON records (applications, schedules, file metadata)
 *   IndexedDB     the actual file bytes, which would blow past the
 *                 localStorage quota within a couple of resumes
 *
 * Everything stays on the device. Nothing is uploaded anywhere.
 */

const NS = "jobtrack";
export const KEYS = {
  apps: `${NS}:apps:v1`,
  events: `${NS}:events:v1`,
  files: `${NS}:fileindex:v1`,
};

/* ---------------------------- records ---------------------------- */

export function loadJSON(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) || typeof parsed === "object" ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function saveJSON(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.error("Could not save", key, err);
    return false;
  }
}

/* ------------------------- file contents ------------------------- */

const DB_NAME = `${NS}-files`;
const STORE = "blobs";
let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = window.indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx(mode, run) {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = run(t.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      })
  );
}

export const putBlob = (id, blob) => tx("readwrite", (s) => s.put(blob, id));
export const getBlob = (id) => tx("readonly", (s) => s.get(id));
export const deleteBlob = (id) => tx("readwrite", (s) => s.delete(id));

/** Hands the file back to the user as a normal browser download. */
export async function downloadBlob(id, filename) {
  const blob = await getBlob(id);
  if (!blob) throw new Error("File not found in storage.");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* --------------------------- backup ------------------------------ */

/** Records only. Files are too big to sensibly fold into a JSON export. */
export function exportRecords() {
  return {
    exportedAt: new Date().toISOString(),
    version: 1,
    applications: loadJSON(KEYS.apps, []),
    schedules: loadJSON(KEYS.events, []),
    documents: loadJSON(KEYS.files, []),
  };
}

export function importRecords(payload) {
  if (!payload || typeof payload !== "object") throw new Error("That file is not a valid backup.");
  const apps = Array.isArray(payload.applications) ? payload.applications : [];
  const events = Array.isArray(payload.schedules) ? payload.schedules : [];
  saveJSON(KEYS.apps, apps);
  saveJSON(KEYS.events, events);
  return { apps, events };
}
