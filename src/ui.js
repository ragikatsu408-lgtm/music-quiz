export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function brand() {
  return `
    <header class="brand">
      <div class="brand-mark" aria-hidden="true">♪</div>
      <div class="brand-copy">
        <strong>Музыкальный класс</strong>
        <span>Учитель задаёт тон. Ученик отвечает.</span>
      </div>
    </header>
  `;
}

export function formatDuration(ms) {
  const total = Math.max(0, Math.round(Number(ms) / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  if (m <= 0) return `${s} с`;
  return `${m} мин ${s} с`;
}
