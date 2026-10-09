import { classroomStatus, MODE_LABELS } from "./classroom.js";
import { escapeHtml, brand, formatDuration } from "./ui.js";

function banner() {
  const status = classroomStatus();
  if (status.backend === "supabase" && !status.error) {
    return `<p class="save-note ok">Данные пишутся в Supabase и дублируются локально.</p>`;
  }
  return `<div class="error-box" role="status">${escapeHtml(status.error || "Класс работает локально в этом браузере.")}</div>`;
}

export function renderTeacherDash(state) {
  const quizzes = state.teacherQuizzes || [];
  const rooms = state.teacherRooms || [];
  const quizList = quizzes.length
    ? quizzes
        .map(
          (quiz) => `<li class="list-row">
            <span>
              <strong>${escapeHtml(quiz.title)}</strong>
              <span class="when">${quiz.questions?.length || 0} вопр.</span>
            </span>
            <span class="row-actions">
              <button class="btn btn-ghost" data-action="quiz-edit" data-id="${escapeHtml(quiz.id)}">Изменить</button>
              <button class="btn btn-ghost" data-action="quiz-delete" data-id="${escapeHtml(quiz.id)}">Удалить</button>
              <button class="btn btn-primary" data-action="room-start-quiz" data-id="${escapeHtml(quiz.id)}">Код</button>
            </span>
          </li>`,
        )
        .join("")
    : `<p class="muted">Пока нет своих викторин — создайте первую или запустите встроенный режим.</p>`;

  const roomList = rooms.length
    ? rooms
        .slice(0, 8)
        .map(
          (room) => `<li class="list-row">
            <span>
              <strong class="code-inline">${escapeHtml(room.code)}</strong>
              ${escapeHtml(room.title)} · ${escapeHtml(MODE_LABELS[room.mode] || room.mode)}
            </span>
            <button class="btn btn-ghost" data-action="teacher-results" data-id="${escapeHtml(room.id)}">Результаты</button>
          </li>`,
        )
        .join("")
    : `<p class="muted">Комнат ещё нет.</p>`;

  return `
    ${brand()}
    <section class="card">
      <h1>Кабинет учителя</h1>
      <p class="lede">Соберите вопросы или откройте готовый режим. Ученики входят по коду.</p>
      ${banner()}
      <h2>Встроенные режимы</h2>
      <div class="actions" style="margin-bottom:22px">
        <button class="btn btn-primary" data-action="room-start-mode" data-mode="melody">Мелодия</button>
        <button class="btn btn-primary" data-action="room-start-mode" data-mode="picture">Инструмент</button>
        <button class="btn btn-primary" data-action="room-start-mode" data-mode="composer">Композитор</button>
        <button class="btn btn-primary" data-action="room-start-mode" data-mode="sing">Пение</button>
      </div>
      <div class="actions" style="margin-bottom:8px">
        <button class="btn btn-ghost" data-action="quiz-new">Новая викторина</button>
        <button class="btn btn-ghost" data-action="home">На главную</button>
      </div>
    </section>
    <section class="card" style="margin-top:16px">
      <h2>Мои викторины</h2>
      <ul class="plain-list">${quizList}</ul>
    </section>
    <section class="card" style="margin-top:16px">
      <h2>Комнаты</h2>
      <ul class="plain-list">${roomList}</ul>
    </section>
  `;
}

export function renderTeacherRoom(state) {
  const room = state.activeRoom;
  if (!room) return renderTeacherDash(state);
  return `
    ${brand()}
    <section class="card">
      <h1>Комната открыта</h1>
      <p class="lede">${escapeHtml(room.title)}${
        MODE_LABELS[room.mode] && MODE_LABELS[room.mode] !== room.title
          ? ` · ${escapeHtml(MODE_LABELS[room.mode])}`
          : ""
      }</p>
      ${banner()}
      <div class="room-code" aria-label="Код комнаты">${escapeHtml(room.code)}</div>
      <p class="lede">Назовите код ученикам или пусть введут его на главной.</p>
      <div class="actions">
        <button class="btn btn-primary" data-action="teacher-results" data-id="${escapeHtml(room.id)}">Результаты</button>
        <button class="btn btn-ghost" data-action="role-teacher">К кабинету</button>
      </div>
    </section>
  `;
}

function emptyQuestion() {
  return {
    id: `q-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    prompt: "",
    audio: "",
    seconds: 15,
    choices: [
      { id: "a", text: "" },
      { id: "b", text: "" },
      { id: "c", text: "" },
      { id: "d", text: "" },
    ],
    correctId: "a",
  };
}

export { emptyQuestion };

export function renderTeacherEdit(state) {
  const quiz = state.editQuiz || { title: "", questions: [emptyQuestion()] };
  const questions = (quiz.questions || [])
    .map((question, index) => {
      const choices = (question.choices || [])
        .map(
          (choice) => `<label class="choice-edit">
            <input type="radio" name="correct-${index}" value="${escapeHtml(choice.id)}" ${
              question.correctId === choice.id ? "checked" : ""
            } data-edit="correct" data-q="${index}" />
            <input type="text" data-edit="choice" data-q="${index}" data-choice="${escapeHtml(choice.id)}" value="${escapeHtml(choice.text)}" placeholder="Вариант ${escapeHtml(choice.id)}" />
          </label>`,
        )
        .join("");
      return `<article class="editor-q">
        <div class="meta">Вопрос ${index + 1}</div>
        <label class="field"><span>Формулировка</span>
          <input type="text" data-edit="prompt" data-q="${index}" value="${escapeHtml(question.prompt)}" placeholder="Что звучит?" />
        </label>
        <label class="field"><span>Аудио URL или уже выбранный файл</span>
          <input type="text" data-edit="audio" data-q="${index}" value="${escapeHtml(question.audio || "")}" placeholder="/audio/ode-to-joy.wav или https://…" />
        </label>
        <label class="field"><span>Загрузить файл</span>
          <input type="file" accept="audio/*,.wav,.mp3,.ogg" data-edit="file" data-q="${index}" />
        </label>
        <label class="field"><span>Секунд на ответ</span>
          <input type="number" min="5" max="60" data-edit="seconds" data-q="${index}" value="${escapeHtml(question.seconds || 15)}" />
        </label>
        <p class="hint">Правильный ответ — отмеченная точка.</p>
        ${choices}
        <button class="btn btn-ghost" data-action="quiz-del-q" data-q="${index}">Удалить вопрос</button>
      </article>`;
    })
    .join("");

  const editorError = state.editorError
    ? `<div class="error-box">${escapeHtml(state.editorError)}</div>`
    : "";

  return `
    ${brand()}
    <section class="card">
      <h1>${quiz.id ? "Редактирование" : "Новая викторина"}</h1>
      ${banner()}
      ${editorError}
      <label class="field"><span>Название</span>
        <input type="text" data-edit="title" value="${escapeHtml(quiz.title || "")}" placeholder="Урок 5: классика" />
      </label>
      ${questions}
      <div class="actions">
        <button class="btn btn-ghost" data-action="quiz-add-q">Добавить вопрос</button>
        <button class="btn btn-primary" data-action="quiz-save">Сохранить</button>
        <button class="btn btn-ghost" data-action="role-teacher">Отмена</button>
      </div>
    </section>
  `;
}

export function renderTeacherResults(state) {
  const room = state.activeRoom;
  const attempts = state.roomAttempts || [];
  if (!room) return renderTeacherDash(state);

  const missMap = new Map();
  attempts.forEach((attempt) => {
    (attempt.missed || []).forEach((title) => {
      missMap.set(title, (missMap.get(title) || 0) + 1);
    });
  });
  const missed = [...missMap.entries()].sort((a, b) => b[1] - a[1]);
  const missBlock = missed.length
    ? `<ul class="recap">${missed
        .slice(0, 8)
        .map(([title, count]) => `<li><span>${escapeHtml(title)}</span><span class="mark">${count}</span></li>`)
        .join("")}</ul>`
    : `<p class="muted">Пока нет ошибок — или попыток ещё не было.</p>`;

  const rows = attempts.length
    ? `<div class="table-wrap"><table class="grid">
        <thead><tr><th>Ученик</th><th>Баллы</th><th>%</th><th>Время</th></tr></thead>
        <tbody>${attempts
          .map(
            (row) => `<tr>
              <td>${escapeHtml(row.player)}</td>
              <td>${row.score} / ${row.total}</td>
              <td>${row.percent}%</td>
              <td>${escapeHtml(formatDuration(row.time_spent_ms))}</td>
            </tr>`,
          )
          .join("")}</tbody>
      </table></div>`
    : `<p class="muted">Ученики ещё не сдали работу. Обновите страницу, когда сыграют во второй вкладке.</p>`;

  return `
    ${brand()}
    <section class="card">
      <h1>Результаты</h1>
      <p class="lede">Код ${escapeHtml(room.code)} · ${escapeHtml(room.title)}</p>
      ${banner()}
      ${rows}
      <h2>Чаще всего ошибались</h2>
      ${missBlock}
      <div class="actions">
        <button class="btn btn-ghost" data-action="role-teacher">К кабинету</button>
        <button class="btn btn-ghost" data-action="home">На главную</button>
      </div>
    </section>
  `;
}
