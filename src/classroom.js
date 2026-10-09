import { createClient } from "@supabase/supabase-js";
import { newId, randomRoomCode, readLocalDb, removeLocal, upsertLocal } from "./store.js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

let client = null;
let lastError = "";
let backend = "local";

export function classroomStatus() {
  return { backend, error: lastError };
}

function getClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("нет ключа");
  }
  if (!client) client = createClient(supabaseUrl, supabaseAnonKey);
  return client;
}

function withTimeout(promise, ms = 2800) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      window.setTimeout(() => reject(new Error("timeout")), ms);
    }),
  ]);
}

async function trySupabase(fn) {
  try {
    const result = await withTimeout(fn(getClient()));
    backend = "supabase";
    lastError = "";
    return result;
  } catch (error) {
    backend = "local";
    const message = error?.message || String(error);
    lastError =
      /failed to fetch|networkerror|timeout|load failed/i.test(message)
        ? "Нет связи с Supabase — класс работает локально в этом браузере (две вкладки на одном компьютере)."
        : `Supabase недоступен (${message}). Данные хранятся локально в браузере.`;
    return null;
  }
}

export async function listQuizzes() {
  const remote = await trySupabase(async (sb) => {
    const { data, error } = await sb.from("classroom_quizzes").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  });
  if (remote) {
    remote.forEach((row) => upsertLocal("quizzes", row, { quiet: true }));
    return remote;
  }
  return readLocalDb().quizzes;
}

export async function saveQuiz(quiz) {
  const row = {
    id: quiz.id || newId(),
    title: String(quiz.title || "Без названия").trim() || "Без названия",
    questions: Array.isArray(quiz.questions) ? quiz.questions : [],
    created_at: quiz.created_at || new Date().toISOString(),
  };
  upsertLocal("quizzes", row);
  await trySupabase(async (sb) => {
    const { error } = await sb.from("classroom_quizzes").upsert(row);
    if (error) throw error;
  });
  return row;
}

export async function deleteQuiz(id) {
  removeLocal("quizzes", id);
  await trySupabase(async (sb) => {
    const { error } = await sb.from("classroom_quizzes").delete().eq("id", id);
    if (error) throw error;
  });
}

export async function startRoom({ quiz, mode, title }) {
  const db = readLocalDb();
  const code = randomRoomCode(db.rooms.map((room) => room.code));
  const snapshot = quiz
    ? { id: quiz.id, title: quiz.title, questions: quiz.questions }
    : null;
  const row = {
    id: newId(),
    code,
    quiz_id: quiz?.id || null,
    mode: mode || "custom",
    title: title || quiz?.title || "Викторина",
    snapshot,
    status: "live",
    created_at: new Date().toISOString(),
  };
  upsertLocal("rooms", row);
  await trySupabase(async (sb) => {
    const { error } = await sb.from("classroom_rooms").insert(row);
    if (error) throw error;
  });
  return row;
}

export async function getRoomByCode(code) {
  const clean = String(code || "").replace(/\D/g, "").slice(0, 6);
  const remote = await trySupabase(async (sb) => {
    const { data, error } = await sb.from("classroom_rooms").select("*").eq("code", clean).maybeSingle();
    if (error) throw error;
    return data;
  });
  if (remote) {
    upsertLocal("rooms", remote, { quiet: true });
    return remote;
  }
  return readLocalDb().rooms.find((room) => room.code === clean) || null;
}

export async function saveAttempt(attempt) {
  const row = {
    id: attempt.id || newId(),
    room_id: attempt.room_id,
    player: attempt.player,
    score: attempt.score,
    total: attempt.total,
    percent: attempt.percent,
    time_spent_ms: attempt.time_spent_ms,
    missed: attempt.missed || [],
    answers: attempt.answers || [],
    created_at: attempt.created_at || new Date().toISOString(),
  };
  upsertLocal("attempts", row);
  await trySupabase(async (sb) => {
    const { error } = await sb.from("classroom_attempts").insert(row);
    if (error) throw error;
  });
  return row;
}

export async function listAttempts(roomId) {
  const remote = await trySupabase(async (sb) => {
    const { data, error } = await sb
      .from("classroom_attempts")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  });
  if (remote) {
    remote.forEach((row) => upsertLocal("attempts", row, { quiet: true }));
    return remote;
  }
  return readLocalDb().attempts.filter((row) => row.room_id === roomId);
}

export async function listRooms() {
  const remote = await trySupabase(async (sb) => {
    const { data, error } = await sb.from("classroom_rooms").select("*").order("created_at", { ascending: false }).limit(20);
    if (error) throw error;
    return data;
  });
  if (remote) {
    remote.forEach((row) => upsertLocal("rooms", row, { quiet: true }));
    return remote;
  }
  return readLocalDb().rooms;
}

export const MODE_LABELS = {
  melody: "Угадать мелодию",
  picture: "Угадать инструмент",
  composer: "Угадать композитора",
  sing: "Спеть самому",
  custom: "Своя викторина",
};
