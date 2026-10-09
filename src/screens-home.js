import { escapeHtml, brand } from "./ui.js";

export function renderRoleHome(state) {
  const joinError = state.joinError
    ? `<div class="error-box" role="alert">${escapeHtml(state.joinError)}</div>`
    : "";
  return `
    ${brand()}
    <section class="card">
      <h1>Музыкальный класс</h1>
      <p class="lede">
        Учитель собирает викторину и открывает комнату. Ученик входит по шестизначному коду
        и играет — в том числе встроенные режимы: мелодия, инструмент, композитор, пение.
      </p>
      <div class="role-grid">
        <button class="role-card" data-action="role-teacher">
          <strong>Я Учитель</strong>
          <span>Создавайте вопросы, запускайте комнату, смотрите результаты</span>
        </button>
        <button class="role-card" data-action="role-student">
          <strong>Я Ученик</strong>
          <span>Имя, код комнаты — и можно отвечать</span>
        </button>
      </div>
    </section>
    <section class="card" style="margin-top:16px">
      <h2>Вход ученика</h2>
      <p class="lede">Если код уже есть — сразу сюда.</p>
      ${joinError}
      <label class="field">
        <span>Имя</span>
        <input data-field="player" type="text" maxlength="40" autocomplete="nickname" placeholder="Аня" value="${escapeHtml(state.playerName)}" />
      </label>
      <label class="field">
        <span>Код комнаты</span>
        <input data-field="room-code" inputmode="numeric" maxlength="6" placeholder="123456" value="${escapeHtml(state.roomCodeInput || "")}" />
      </label>
      <div class="actions">
        <button class="btn btn-primary" data-action="student-join">Войти в комнату</button>
        <button class="btn btn-ghost" data-action="leaderboard">Таблица лидеров</button>
      </div>
    </section>
  `;
}

export function renderStudentJoin(state) {
  const joinError = state.joinError
    ? `<div class="error-box" role="alert">${escapeHtml(state.joinError)}</div>`
    : "";
  return `
    ${brand()}
    <section class="card">
      <h1>Я ученик</h1>
      <p class="lede">Введите имя и код, который показал учитель.</p>
      ${joinError}
      <label class="field">
        <span>Имя</span>
        <input data-field="player" type="text" maxlength="40" autocomplete="nickname" placeholder="Аня" value="${escapeHtml(state.playerName)}" />
      </label>
      <label class="field">
        <span>Код комнаты</span>
        <input data-field="room-code" inputmode="numeric" maxlength="6" placeholder="123456" value="${escapeHtml(state.roomCodeInput || "")}" />
      </label>
      <div class="actions">
        <button class="btn btn-primary" data-action="student-join">Начать</button>
        <button class="btn btn-ghost" data-action="home">На главную</button>
      </div>
    </section>
  `;
}
