import "./style.css";
import { QUESTIONS, QUESTION_SECONDS, scoreMessage } from "./questions.js";
import { getPlayerLabel, saveScore } from "./supabase.js";

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

function currentQuestion() {
  return QUESTIONS[state.index];
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
  if (!question) return;
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
    if (state.index + 1 >= QUESTIONS.length) {
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
      total: QUESTIONS.length,
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
  playClip();
}

function readPlayerNameFromForm() {
  const input = app.querySelector("[data-field='player']");
  if (input) state.playerName = input.value;
}

function startQuiz() {
  readPlayerNameFromForm();
  if (!QUESTIONS.length) {
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
      <h1>Угадайте мелодию за 15 секунд</h1>
      <p class="lede">
        Восемь коротких фрагментов — классика и народные песни. Звук уже в приложении,
        интернет для музыки не нужен.
      </p>
      <ul class="rules">
        <li><span class="dot"></span>Четыре варианта ответа на каждый вопрос</li>
        <li><span class="dot"></span>Таймер 15 секунд: тишина тоже считается ответом</li>
        <li><span class="dot"></span>Фрагмент можно переслушать, пока время идёт</li>
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
        <button class="btn btn-primary" data-action="start">Начать игру</button>
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
  const total = QUESTIONS.length;
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
    status = `<p class="status bad">Не тот фрагмент. Правильный вариант выделен.</p>`;
  }

  const error = state.audioError
    ? `<div class="error-box" role="alert">${escapeHtml(state.audioError)}</div>`
    : "";

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
      ${error}
      <div class="player ${state.playing ? "playing" : ""}">
        <div class="waveform" aria-hidden="true">
          <span></span><span></span><span></span><span></span><span></span><span></span><span></span>
        </div>
        <button class="btn btn-ghost" data-action="replay" ${state.locked ? "disabled" : ""}>
          ${state.playing ? "Играет фрагмент…" : "Слушать фрагмент"}
        </button>
        <p class="hint">Подсказка: ${escapeHtml(question.hint)}</p>
      </div>
      <div class="choices">${choices}</div>
      ${status}
    </section>
  `;
}

function renderResults() {
  const total = QUESTIONS.length;
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
        <p class="lede">${escapeHtml(scoreMessage(state.score, total))}</p>
        <p class="muted">${escapeHtml(getPlayerLabel(state.playerName))} · ${state.score} из ${total}</p>
      </div>
      ${renderSaveNotice()}
      ${
        state.answers.length
          ? `<ul class="recap">${recap}</ul>`
          : `<div class="state"><p>Ответов пока нет — раунд оборвался до первого вопроса.</p></div>`
      }
      <div class="actions">
        <button class="btn btn-primary" data-action="start">Сыграть ещё раз</button>
        <button class="btn btn-ghost" data-action="home">На главную</button>
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
        : state.screen === "empty"
          ? renderEmpty()
          : renderHome();
  app.innerHTML = `<main class="shell">${view}</main>`;
}

app.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action], [data-choice]");
  if (!target) return;
  if (target.dataset.action === "start") startQuiz();
  if (target.dataset.action === "home") goHome();
  if (target.dataset.action === "replay") playClip();
  if (target.dataset.choice) lockAnswer(target.dataset.choice);
});

if (!QUESTIONS.length) {
  state.screen = "empty";
}

render();
