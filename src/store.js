const KEY = "music-quiz-classroom-v1";
const CHANNEL = "music-quiz-classroom";

function emptyDb() {
  return { quizzes: [], rooms: [], attempts: [] };
}

export function readLocalDb() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyDb();
    const parsed = JSON.parse(raw);
    return {
      quizzes: Array.isArray(parsed.quizzes) ? parsed.quizzes : [],
      rooms: Array.isArray(parsed.rooms) ? parsed.rooms : [],
      attempts: Array.isArray(parsed.attempts) ? parsed.attempts : [],
    };
  } catch {
    return emptyDb();
  }
}

let channel = null;
const listeners = new Set();

function emit(kind, payload) {
  listeners.forEach((fn) => {
    try {
      fn({ kind, payload });
    } catch {
      /* ignore */
    }
  });
}

function post(kind, payload) {
  emit(kind, payload);
  try {
    if (!channel) channel = new BroadcastChannel(CHANNEL);
    channel.postMessage({ kind, payload });
  } catch {
    /* ignore */
  }
}

export function writeLocalDb(db, options = {}) {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch {
    /* quota / private mode */
  }
  if (!options.quiet) post("db");
}

export function upsertLocal(collection, row, options = {}) {
  const db = readLocalDb();
  const list = db[collection];
  const index = list.findIndex((item) => item.id === row.id);
  if (index >= 0) list[index] = row;
  else list.unshift(row);
  writeLocalDb(db, options);
  return row;
}

export function removeLocal(collection, id, options = {}) {
  const db = readLocalDb();
  db[collection] = db[collection].filter((item) => item.id !== id);
  writeLocalDb(db, options);
}

export function subscribeClassroom(fn) {
  listeners.add(fn);
  if (!channel) {
    try {
      channel = new BroadcastChannel(CHANNEL);
      channel.addEventListener("message", (event) => emit(event.data?.kind || "db", event.data?.payload));
    } catch {
      /* ignore */
    }
  }
  const onStorage = (event) => {
    if (event.key === KEY) emit("db");
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(fn);
    window.removeEventListener("storage", onStorage);
  };
}

export function newId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function randomRoomCode(existing = []) {
  const taken = new Set(existing);
  for (let i = 0; i < 40; i += 1) {
    const code = String(100000 + Math.floor(Math.random() * 900000));
    if (!taken.has(code)) return code;
  }
  return String(Date.now()).slice(-6);
}
