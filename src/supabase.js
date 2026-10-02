import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

let client = null;

export function getPlayerLabel(name) {
  const trimmed = String(name ?? "").trim();
  return trimmed.slice(0, 40) || "Игрок";
}

function getClient() {
  if (!supabaseUrl) {
    throw new Error("Не задан VITE_SUPABASE_URL в .env");
  }
  if (!supabaseAnonKey) {
    throw new Error(
      "Не задан VITE_SUPABASE_ANON_KEY в .env — вставьте anon key из панели Supabase (Шаг 1).",
    );
  }
  if (!client) {
    client = createClient(supabaseUrl, supabaseAnonKey);
  }
  return client;
}

function describeSupabaseError(error, fallback) {
  const message = error?.message || "";
  const code = String(error?.code || "");
  const status = error?.status;
  const denied =
    status === 401 ||
    status === 403 ||
    code === "42501" ||
    /permission denied|row-level security|not allowed|rls/i.test(message);
  if (denied) {
    return "Чтение таблицы scores запрещено (RLS или GRANT). Выполните supabase/scores.sql в SQL Editor.";
  }
  if (/failed to fetch|networkerror|load failed/i.test(message)) {
    return "Нет связи с Supabase. Проверьте интернет и адрес проекта.";
  }
  return message || fallback;
}

export async function saveScore({ player, score, total }) {
  try {
    const supabase = getClient();
    const { error } = await supabase.from("scores").insert({
      player: getPlayerLabel(player),
      score,
      total,
    });
    if (error) {
      throw new Error(describeSupabaseError(error, "Supabase отклонил запись счёта."));
    }
  } catch (error) {
    throw new Error(describeSupabaseError(error, "Supabase отклонил запись счёта."));
  }
}

export async function fetchLeaderboard(limit = 10) {
  try {
    const supabase = getClient();
    const { data, error } = await supabase
      .from("scores")
      .select("id, player, score, total, created_at")
      .order("score", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) {
      throw new Error(describeSupabaseError(error, "Не удалось загрузить таблицу лидеров."));
    }
    return Array.isArray(data) ? data : [];
  } catch (error) {
    throw new Error(describeSupabaseError(error, "Не удалось загрузить таблицу лидеров."));
  }
}
