import "./style.css";
import { COMPOSER_QUESTIONS, INSTRUMENT_QUESTIONS, QUESTIONS, QUESTION_SECONDS, scoreMessage } from "./questions.js";
import { fetchLeaderboard, getPlayerLabel, saveScore } from "./supabase.js";

const app = document.querySelector("#app");

const state = {
  screen: "home",
  index: 0,
  score: 0,
  remaining: QUESTION_SECONDS,
  locked: false,
  selectedId: null,
  timedOut: false,
  playing: false,
  audioError: "",
  answers: [],
  playerName: "",
  saveStatus: "idle",
  saveError: "",
  boardStatus: "idle",
  boardError: "",
  boardRows: [],
  boardFrom: "home",
  mode: "melody",
};

let timerId = null;
let audio = null;

function stopTimer() {
  if (timerId) {
    window.clearInterval(timerId);
    timerId = null;
  }
}

function stopAudio() {
  if (!audio) return;
  audio.pause();
  audio.currentTime = 0;
  state.playing = false;
}

function currentDeck() {
  if (state.mode === "picture") return INSTRUMENT_QUESTIONS;
  if (state.mode === "composer") return COMPOSER_QUESTIONS;
  return QUESTIONS;
}

function isPhotoMode() {
  return state.mode === "picture" || state.mode === "composer";
}

function replayAction() {
  if (state.mode === "picture") return "picture";
  if (state.mode === "composer") return "composer";
  return "start";
}

function currentQuestion() {
  return currentDeck()[state.index];
}

function startTimer() {
  stopTimer();
  state.remaining = QUESTION_SECONDS;
  timerId = window.setInterval(() => {
    state.remaining -= 1;
    if (state.remaining <= 0) {
      state.remaining = 0;
      if (!state.locked) lockAnswer(null, true);
      else render();
      return;
    }
    render();
  }, 1000);
}

async function playClip() {
  const question = currentQuestion();
  if (!question?.audio) return;
  state.audioError = "";
  stopAudio();
  audio = new Audio(question.audio);
  audio.addEventListener("ended", () => {
    state.playing = false;
    render();
  });
  try {
    await audio.play();
    state.playing = true;
  } catch (error) {
    state.playing = false;
    state.audioError =
      error?.name === "NotAllowedError"
        ? "Браузер заблокировал автозапуск. Нажмите «Слушать фрагмент»."
        : "Не удалось воспроизвести фрагмент. Проверьте звук и попробуйте ещё раз.";
  }
  render();
}

function lockAnswer(choiceId, timedOut = false) {
  if (state.locked) return;
  const question = currentQuestion();
  const correct = choiceId === question.correctId;
  state.locked = true;
  state.selectedId = choiceId;
  state.timedOut = timedOut;
  if (correct) state.score += 1;
  state.answers.push({
    id: question.id,
    title: question.choices.find((c) => c.id === question.correctId)?.text ?? question.id,
    correct,
    timedOut,
  });
  stopTimer();
  stopAudio();
  render();
  window.setTimeout(() => {
    if (state.index + 1 >= currentDeck().length) {
      finishQuiz();
      return;
    }
    state.index += 1;
    beginQuestion();
  }, 1100);
}

function finishQuiz() {
  stopTimer();
  stopAudio();
  state.screen = "results";
  state.saveStatus = "saving";
  state.saveError = "";
  render();
  persistScore();
}

async function persistScore() {
  try {
    await saveScore({
      player: state.playerName,
      score: state.score,
      total: currentDeck().length,
    });
    state.saveStatus = "saved";
    state.saveError = "";
  } catch (error) {
    state.saveStatus = "error";
    state.saveError =
      error?.message || "Не удалось сохранить счёт. Проверьте сеть и ключ Supabase.";
  }
  if (state.screen === "results") render();
}

function beginQuestion() {
  state.locked = false;
  state.selectedId = null;
  state.timedOut = false;
  state.audioError = "";
  state.playing = false;
  startTimer();
  render();
  if (currentQuestion()?.audio) playClip();
}

function readPlayerNameFromForm() {
  const input = app.querySelector("[data-field='player']");
  if (input) state.playerName = input.value;
}

function startQuiz(mode = state.mode || "melody") {
  readPlayerNameFromForm();
  state.mode = mode === "picture" || mode === "composer" ? mode : "melody";
  const deck = currentDeck();
  if (!deck.length) {
    state.screen = "empty";
    render();
    return;
  }
  state.screen = "quiz";
  state.index = 0;
  state.score = 0;
  state.answers = [];
  state.saveStatus = "idle";
  state.saveError = "";
  beginQuestion();
}

function goHome() {
  stopTimer();
  stopAudio();
  state.screen = "home";
  state.index = 0;
  state.score = 0;
  state.answers = [];
  state.audioError = "";
  render();
}

function openLeaderboard() {
  readPlayerNameFromForm();
  stopTimer();
  stopAudio();
  if (state.screen === "results") state.boardFrom = "results";
  else if (state.screen !== "leaderboard") state.boardFrom = "home";
  state.screen = "leaderboard";
  state.boardStatus = "loading";
  state.boardError = "";
  state.boardRows = [];
  render();
  loadLeaderboard();
}

function closeLeaderboard() {
  state.screen = state.boardFrom === "results" ? "results" : "home";
  render();
}

async function loadLeaderboard() {
  try {
    const rows = await fetchLeaderboard(10);
    state.boardRows = rows;
    state.boardStatus = rows.length ? "ready" : "empty";
    state.boardError = "";
  } catch (error) {
    state.boardRows = [];
    state.boardStatus = "error";
    state.boardError =
      error?.message || "Не удалось загрузить таблицу лидеров. Проверьте сеть и RLS.";
  }
  if (state.screen === "leaderboard") render();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function brand() {
  return `
    <header class="brand">
      <div class="brand-mark" aria-hidden="true">♪</div>
      <div class="brand-copy">
        <strong>Музыкальная викторина</strong>
        <span>Слушайте. Узнавайте. Не подглядывайте.</span>
      </div>
    </header>
  `;
}

function renderHome() {
  return `
    ${brand()}
    <section class="card">
      <h1>Музыкальная викторина</h1>
      <p class="lede">
        Мелодии по фрагменту, инструменты и композиторы — по фото. Звук и картинки уже в приложении,
        внешние сервисы для игры не нужны.
      </p>
      <ul class="rules">
        <li><span class="dot"></span>Четыре варианта ответа на каждый вопрос</li>
        <li><span class="dot"></span>Таймер 15 секунд: тишина тоже считается ответом</li>
        <li><span class="dot"></span>Мелодии — по звуку; инструменты и композиторы — только по фото</li>
      </ul>
      <label class="field">
        <span>Ваше имя для таблицы счёта</span>
        <input
          data-field="player"
          type="text"
          maxlength="40"
          autocomplete="nickname"
          placeholder="Игрок"
          value="${escapeHtml(state.playerName)}"
        />
      </label>
      <div class="actions">
        <button class="btn btn-primary" data-action="start">Угадать мелодию</button>
        <button class="btn btn-primary" data-action="picture">Угадать инструмент</button>
        <button class="btn btn-primary" data-action="composer">Угадать композитора</button>
        <button class="btn btn-ghost" data-action="leaderboard">Таблица лидеров</button>
      </div>
    </section>
  `;
}

function renderEmpty() {
  return `
    ${brand()}
    <section class="card state">
      <h2>Вопросы ещё не загружены</h2>
      <p>Набор викторины пуст. Добавьте вопросы в <code>src/questions.js</code> и обновите страницу.</p>
      <div class="actions" style="justify-content:center">
        <button class="btn btn-ghost" data-action="home">На главную</button>
      </div>
    </section>
  `;
}

function circumference() {
  return 2 * Math.PI * 22;
}

function renderQuiz() {
  const question = currentQuestion();
  if (!question) return renderEmpty();
  const deck = currentDeck();
  const total = deck.length;
  const pictureClue = isPhotoMode();
  const dash = circumference();
  const progress = state.remaining / QUESTION_SECONDS;
  const offset = dash * (1 - progress);
  const urgent = state.remaining <= 5 ? "urgent" : "";
  const choices = question.choices
    .map((choice) => {
      let cls = "choice";
      if (state.locked) {
        if (choice.id === question.correctId) cls += " correct";
        else if (choice.id === state.selectedId) cls += " wrong";
      }
      return `<button class="${cls}" data-choice="${choice.id}" ${
        state.locked ? "disabled" : ""
      }>${escapeHtml(choice.text)}</button>`;
    })
    .join("");

  let status = "";
  if (state.locked && state.timedOut) {
    status = `<p class="status bad">Время вышло. Правильный ответ подсвечен зелёным.</p>`;
  } else if (state.locked && state.selectedId === question.correctId) {
    status = `<p class="status ok">Верно. Идём дальше.</p>`;
  } else if (state.locked) {
    status = `<p class="status bad">Не тот ответ. Правильный вариант выделен.</p>`;
  }

  const error = state.audioError
    ? `<div class="error-box" role="alert">${escapeHtml(state.audioError)}</div>`
    : "";

  const title =
    question.imageAlt ||
    question.choices.find((c) => c.id === question.correctId)?.text ||
    question.id;
  const art = question.image
    ? `<img class="question-art${pictureClue ? " clue" : ""}${
        state.mode === "composer" ? " portrait" : ""
      }" src="${escapeHtml(question.image)}" alt="${escapeHtml(title)}" />`
    : "";

  const player = pictureClue
    ? `<p class="hint picture-hint">Подсказка: ${escapeHtml(question.hint)}</p>`
    : `<div class="player ${state.playing ? "playing" : ""}">
        <div class="waveform" aria-hidden="true">
          <span></span><span></span><span></span><span></span><span></span><span></span><span></span>
        </div>
        <button class="btn btn-ghost" data-action="replay" ${state.locked ? "disabled" : ""}>
          ${state.playing ? "Играет фрагмент…" : "Слушать фрагмент"}
        </button>
        <p class="hint">Подсказка: ${escapeHtml(question.hint)}</p>
      </div>`;

  return `
    ${brand()}
    <section class="card">
      <div class="topbar">
        <div>
          <div class="meta">Вопрос ${state.index + 1} из ${total} · счёт ${state.score}</div>
          <h2>${escapeHtml(question.prompt)}</h2>
        </div>
        <div class="timer ${urgent}" aria-label="Осталось ${state.remaining} секунд">
          <svg width="54" height="54" viewBox="0 0 54 54" aria-hidden="true">
            <circle cx="27" cy="27" r="22" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="5" />
            <circle cx="27" cy="27" r="22" fill="none" stroke="${
              state.remaining <= 5 ? "#ff6b8a" : "#f4c14e"
            }" stroke-width="5"
              stroke-dasharray="${dash}" stroke-dashoffset="${offset}" stroke-linecap="round" />
          </svg>
          <div class="timer-text">${state.remaining}</div>
        </div>
      </div>
      ${art}
      ${error}
      ${player}
      <div class="choices">${choices}</div>
      ${status}
    </section>
  `;
}

function renderResults() {
  const total = currentDeck().length;
  const recap = state.answers
    .map((item, i) => {
      const mark = item.timedOut ? "время" : item.correct ? "верно" : "ошибка";
      const color = item.correct ? "var(--mint)" : "var(--danger)";
      return `<li><span>${i + 1}. ${escapeHtml(item.title)}</span><span class="mark" style="color:${color}">${mark}</span></li>`;
    })
    .join("");

  return `
    ${brand()}
    <section class="card">
      <div class="score-hero">
        <div class="big">${state.score}/${total}</div>
        <h2>Итоги раунда</h2>
        <p class="lede">${escapeHtml(scoreMessage(state.score, total, state.mode))}</p>
        <p class="muted">${escapeHtml(getPlayerLabel(state.playerName))} · ${state.score} из ${total}</p>
      </div>
      ${renderSaveNotice()}
      ${
        state.answers.length
          ? `<ul class="recap">${recap}</ul>`
          : `<div class="state"><p>Ответов пока нет — раунд оборвался до первого вопроса.</p></div>`
      }
      <div class="actions">
        <button class="btn btn-primary" data-action="${replayAction()}">Сыграть ещё раз</button>
        <button class="btn btn-ghost" data-action="leaderboard">Таблица лидеров</button>
        <button class="btn btn-ghost" data-action="home">На главную</button>
      </div>
    </section>
  `;
}

function formatBoardTime(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function renderLeaderboard() {
  let body = "";
  if (state.boardStatus === "loading") {
    body = `<p class="save-note">Загружаем таблицу лидеров…</p>`;
  } else if (state.boardStatus === "error") {
    body = `<div class="error-box" role="alert">${escapeHtml(state.boardError)}</div>
      <div class="actions" style="margin-bottom:16px">
        <button class="btn btn-ghost" data-action="leaderboard">Повторить</button>
      </div>`;
  } else if (state.boardStatus === "empty") {
    body = `<div class="state"><p>Пока нет сохранённых результатов. Сыграйте раунд — имя появится здесь.</p></div>`;
  } else {
    const rows = state.boardRows
      .map((row, i) => {
        const player = escapeHtml(getPlayerLabel(row.player));
        const score = Number.isFinite(row.score) ? row.score : "—";
        const total = Number.isFinite(row.total) ? ` / ${row.total}` : "";
        const when = formatBoardTime(row.created_at);
        return `<li>
          <span class="rank">${i + 1}</span>
          <span class="who">
            <strong>${player}</strong>
            ${when ? `<span class="when">${escapeHtml(when)}</span>` : ""}
          </span>
          <span class="pts">${score}${total}</span>
        </li>`;
      })
      .join("");
    body = `<ol class="board">${rows}</ol>`;
  }

  const backLabel = state.boardFrom === "results" ? "К итогам" : "На главную";
  const backAction = state.boardFrom === "results" ? "board-back" : "home";

  return `
    ${brand()}
    <section class="card">
      <h1>Таблица лидеров</h1>
      <p class="lede">Десять лучших результатов: сначала счёт, при равенстве — более свежая запись.</p>
      ${body}
      <div class="actions">
        <button class="btn btn-ghost" data-action="${backAction}">${backLabel}</button>
      </div>
    </section>
  `;
}

function renderSaveNotice() {
  if (state.saveStatus === "saving") {
    return `<p class="save-note">Сохраняем счёт в Supabase…</p>`;
  }
  if (state.saveStatus === "saved") {
    return `<p class="save-note ok">Счёт сохранён в таблице scores.</p>`;
  }
  if (state.saveStatus === "error") {
    return `<div class="error-box" role="status">${escapeHtml(state.saveError)}</div>`;
  }
  return "";
}

function render() {
  const view =
    state.screen === "quiz"
      ? renderQuiz()
      : state.screen === "results"
        ? renderResults()
        : state.screen === "leaderboard"
          ? renderLeaderboard()
          : state.screen === "empty"
            ? renderEmpty()
            : renderHome();
  app.innerHTML = `<main class="shell">${view}</main>`;
}

app.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action], [data-choice]");
  if (!target) return;
  if (target.dataset.action === "start") startQuiz("melody");
  if (target.dataset.action === "picture") startQuiz("picture");
  if (target.dataset.action === "composer") startQuiz("composer");
  if (target.dataset.action === "home") goHome();
  if (target.dataset.action === "leaderboard") openLeaderboard();
  if (target.dataset.action === "board-back") closeLeaderboard();
  if (target.dataset.action === "replay") playClip();
  if (target.dataset.choice) lockAnswer(target.dataset.choice);
});

if (!QUESTIONS.length && !INSTRUMENT_QUESTIONS.length && !COMPOSER_QUESTIONS.length) {
  state.screen = "empty";
}

render();
