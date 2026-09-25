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

export async function saveScore({ player, score, total }) {
  const supabase = getClient();
  const { error } = await supabase.from("scores").insert({
    player: getPlayerLabel(player),
    score,
    total,
  });
  if (error) {
    throw new Error(error.message || "Supabase отклонил запись счёта.");
  }
}
