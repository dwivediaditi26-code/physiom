// localCopyStore.js -- where the phone keeps its locked copy of the patient list.
//
// It used to be localStorage, which holds about 5 MB in total. Medical-record files are
// stored inside the patient record, so a few attached photos or PDFs filled it; from then
// on the copy was silently not saved at all and every start waited for all patients to
// download again. The browser's own database (IndexedDB) has no such small limit, so the
// copy lives there. Everything stored here is already encrypted (see localCrypto.js).
//
// read(id) -> the stored value or undefined; write(id, value); remove(id).
// All three reject when the browser gives no database (some private windows): the caller
// then falls back to localStorage, as before.
const DB_NAME = "pm_patient_copy";
const STORE = "copies";

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error("copy storage blocked"));
  });
}

function run(mode, action) {
  return openDb().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    let result;
    const req = action(tx.objectStore(STORE));
    req.onsuccess = () => { result = req.result; };
    tx.oncomplete = () => { db.close(); resolve(result); };
    tx.onabort = () => { db.close(); reject(tx.error || new Error("copy storage aborted")); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  }));
}

const browserStore = {
  read: (id) => run("readonly", (s) => s.get(id)),
  write: (id, value) => run("readwrite", (s) => s.put(value, id)).then(() => undefined),
  remove: (id) => run("readwrite", (s) => s.delete(id)).then(() => undefined),
};

let store = browserStore;
export function setCopyStoreForTests(replacement) { store = replacement || browserStore; }

export const readCopy = (id) => store.read(id);
export const writeCopy = (id, value) => store.write(id, value);
export const removeCopy = (id) => store.remove(id);
