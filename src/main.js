import "./style.css";
import { COMPOSER_QUESTIONS, INSTRUMENT_QUESTIONS, QUESTIONS, QUESTION_SECONDS, SING_QUESTIONS, scoreMessage } from "./questions.js";
import { detectPitch, formatHz, hzToNote, noteFreq, scoreNote, scorePhrase } from "./pitch.js";
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
  recording: false,
  micError: "",
  livePitch: "",
  liveHz: null,
  heardLabel: "",
  singDetail: "",
};

let timerId = null;
let audio = null;
let micStream = null;
let audioCtx = null;
let analyser = null;
let pitchRaf = 0;
let collectedPitches = [];
const pitchBuf = new Float32Array(2048);

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
  if (state.mode === "sing") return SING_QUESTIONS;
  return QUESTIONS;
}

function isPhotoMode() {
  return state.mode === "picture" || state.mode === "composer";
}

function replayAction() {
  if (state.mode === "picture") return "picture";
  if (state.mode === "composer") return "composer";
  if (state.mode === "sing") return "sing";
  return "start";
}

function currentQuestion() {
  return currentDeck()[state.index];
}

function patchTimer() {
  const question = currentQuestion();
  const dash = circumference();
  const progress = QUESTION_SECONDS ? state.remaining / QUESTION_SECONDS : 0;
  const offset = dash * (1 - progress);
  const text = app.querySelector(".timer-text");
  const ring = app.querySelector(".timer circle:nth-child(2)");
  const wrap = app.querySelector(".timer");
  if (text) text.textContent = String(state.remaining);
  if (ring) {
    ring.setAttribute("stroke-dashoffset", String(offset));
    ring.setAttribute("stroke", state.remaining <= 5 ? "#ff6b8a" : "#f4c14e");
  }
  if (wrap) {
    wrap.classList.toggle("urgent", state.remaining <= 5);
    wrap.setAttribute("aria-label", `Осталось ${state.remaining} секунд`);
  }
  void question;
}

function startTimer() {
  stopTimer();
  state.remaining = QUESTION_SECONDS;
  timerId = window.setInterval(() => {
    if (state.mode === "sing" && state.recording) {
      patchTimer();
      return;
    }
    state.remaining -= 1;
    if (state.remaining <= 0) {
      state.remaining = 0;
      if (state.mode === "sing") {
        patchTimer();
        const hint = app.querySelector("[data-sing-timer]");
        if (hint) hint.hidden = false;
        return;
      }
      if (!state.locked) lockAnswer(null, true);
      else render();
      return;
    }
    if (state.recording) patchTimer();
    else render();
  }, 1000);
}

function micUnsupported() {
  return !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia;
}

function releaseMic() {
  if (pitchRaf) {
    window.cancelAnimationFrame(pitchRaf);
    pitchRaf = 0;
  }
  if (micStream) {
    micStream.getTracks().forEach((track) => track.stop());
    micStream = null;
  }
  if (audioCtx) {
    audioCtx.close().catch(() => {});
    audioCtx = null;
  }
  analyser = null;
}

function stopRecording(scoreNow) {
  const wasRecording = state.recording;
  state.recording = false;
  if (pitchRaf) {
    window.cancelAnimationFrame(pitchRaf);
    pitchRaf = 0;
  }
  if (!scoreNow || !wasRecording) return;
  const question = currentQuestion();
  if (!question) return;
  const targetHz = noteFreq(question.targetNote);
  const result =
    question.kind === "phrase"
      ? scorePhrase(collectedPitches, question.targetNotes)
      : scoreNote(collectedPitches, targetHz);
  if (result.reason === "quiet") {
    state.micError = "Не удалось разобрать высоту. Спойте громче и ближе к микрофону.";
    state.heardLabel = "";
    state.singDetail = "";
    render();
    return;
  }
  const heard = result.heardNote || "неясно";
  const cents = Number.isFinite(result.cents) ? Math.round(result.cents) : "—";
  state.heardLabel = `${heard} (${formatHz(result.heardHz)})`;
  state.singDetail =
    question.kind === "phrase"
      ? `Цель: ${question.targetNotes.join(" · ")}. Услышали: ${state.heardLabel}. Совпало нот: ${result.hits}/${result.need}.`
      : `Цель: ${question.targetNote} (${formatHz(targetHz)}). Услышали: ${state.heardLabel}, отклонение ${cents} центов.`;
  finishSingRound(result.ok);
}

function tickPitch() {
  if (!state.recording || !analyser) return;
  analyser.getFloatTimeDomainData(pitchBuf);
  const hz = detectPitch(pitchBuf, audioCtx?.sampleRate || 44100);
  if (hz) {
    collectedPitches.push(hz);
    state.liveHz = hz;
    state.livePitch = hzToNote(hz) || "";
    const live = app.querySelector("[data-live-pitch]");
    if (live) live.textContent = `Слышу: ${state.livePitch} · ${formatHz(hz)}`;
  }
  pitchRaf = window.requestAnimationFrame(tickPitch);
}

async function startRecording() {
  if (state.locked || state.recording) return;
  state.micError = "";
  state.heardLabel = "";
  state.singDetail = "";
  collectedPitches = [];
  stopAudio();
  if (micUnsupported()) {
    state.micError = "Браузер не даёт доступ к микрофону. Откройте игру в Chrome или Firefox по HTTPS/localhost.";
    render();
    return;
  }
  try {
    if (!micStream) {
      micStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: false,
      });
    }
    if (!audioCtx) {
      audioCtx = new AudioContext();
    }
    if (audioCtx.state === "suspended") await audioCtx.resume();
    const source = audioCtx.createMediaStreamSource(micStream);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);
    state.recording = true;
    render();
    tickPitch();
  } catch (error) {
    state.recording = false;
    const denied = error?.name === "NotAllowedError" || error?.name === "PermissionDeniedError";
    const missing = error?.name === "NotFoundError" || error?.name === "DevicesNotFoundError";
    state.micError = denied
      ? "Нет доступа к микрофону. Разрешите микрофон в браузере и нажмите «Повторить»."
      : missing
        ? "Микрофон не найден. Подключите устройство и нажмите «Повторить»."
        : "Не удалось включить микрофон. Проверьте настройки и нажмите «Повторить».";
    render();
  }
}

function finishSingRound(passed) {
  if (state.locked) return;
  const question = currentQuestion();
  state.locked = true;
  state.timedOut = false;
  if (passed) state.score += 1;
  state.answers.push({
    id: question.id,
    title: `${question.title}: ${state.heardLabel || "нет сигнала"}`,
    correct: passed,
    timedOut: false,
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
  }, 1600);
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
    title: question.title || question.choices?.find((c) => c.id === question.correctId)?.text || question.id,
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
  stopRecording(false);
  releaseMic();
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
  state.recording = false;
  state.micError = "";
  state.livePitch = "";
  state.liveHz = null;
  state.heardLabel = "";
  state.singDetail = "";
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
  state.mode = mode === "picture" || mode === "composer" || mode === "sing" ? mode : "melody";
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
  stopRecording(false);
  releaseMic();
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
        Мелодии по фрагменту, инструменты и композиторы по фото, или спойте ноту сами.
        Звук и картинки уже в приложении.
      </p>
      <ul class="rules">
        <li><span class="dot"></span>Четыре варианта на вопросы с выбором; в пении — микрофон и запись</li>
        <li><span class="dot"></span>Таймер 15 секунд: в пении запись не сбрасывается, если время вышло</li>
        <li><span class="dot"></span>Мелодии — по звуку; фото — без звука; пение — образец, затем ваш голос</li>
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
        <button class="btn btn-primary" data-action="sing">Спеть самому</button>
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
  const singing = state.mode === "sing";
  const dash = circumference();
  const progress = state.remaining / QUESTION_SECONDS;
  const offset = dash * (1 - progress);
  const urgent = state.remaining <= 5 ? "urgent" : "";
  const choices = singing
    ? ""
    : question.choices
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
  if (singing && state.locked) {
    status = state.answers.at(-1)?.correct
      ? `<p class="status ok">Близко к цели. ${escapeHtml(state.singDetail)}</p>`
      : `<p class="status bad">Пока далеко. ${escapeHtml(state.singDetail)}</p>`;
  } else if (state.locked && state.timedOut) {
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
    question.title ||
    question.choices?.find((c) => c.id === question.correctId)?.text ||
    question.id;
  const art = question.image
    ? `<img class="question-art${pictureClue ? " clue" : ""}${
        state.mode === "composer" ? " portrait" : ""
      }" src="${escapeHtml(question.image)}" alt="${escapeHtml(title)}" />`
    : "";

  const listenLabel = singing
    ? state.playing
      ? "Играет образец…"
      : "Слушать образец"
    : state.playing
      ? "Играет фрагмент…"
      : "Слушать фрагмент";

  const player = pictureClue
    ? `<p class="hint picture-hint">Подсказка: ${escapeHtml(question.hint)}</p>`
    : singing
      ? renderSingPanel(question, listenLabel)
      : `<div class="player ${state.playing ? "playing" : ""}">
        <div class="waveform" aria-hidden="true">
          <span></span><span></span><span></span><span></span><span></span><span></span><span></span>
        </div>
        <button class="btn btn-ghost" data-action="replay" ${state.locked ? "disabled" : ""}>
          ${listenLabel}
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
      ${choices ? `<div class="choices">${choices}</div>` : ""}
      ${status}
    </section>
  `;
}

function renderSingPanel(question, listenLabel) {
  const target =
    question.kind === "phrase"
      ? question.targetNotes.join(" · ")
      : `${question.targetNote} · ${formatHz(noteFreq(question.targetNote))}`;
  const micError = state.micError
    ? `<div class="error-box" role="alert">${escapeHtml(state.micError)}
        <div class="actions" style="margin-top:10px">
          <button class="btn btn-ghost" data-action="mic-retry">Повторить</button>
        </div>
      </div>`
    : "";
  const recordBtn = state.recording
    ? `<button class="btn btn-primary" data-action="sing-stop">Стоп</button>`
    : `<button class="btn btn-primary" data-action="sing-record" ${state.locked ? "disabled" : ""}>Запись</button>`;
  return `
    <div class="player ${state.playing || state.recording ? "playing" : ""} sing-panel">
      <div class="waveform" aria-hidden="true">
        <span></span><span></span><span></span><span></span><span></span><span></span><span></span>
      </div>
      <p class="hint">Цель: ${escapeHtml(target)}</p>
      <p class="hint" data-live-pitch>${
        state.recording
          ? `Слышу: ${escapeHtml(state.livePitch || "…")} · ${formatHz(state.liveHz)}`
          : state.heardLabel
            ? `Услышали: ${escapeHtml(state.heardLabel)}`
            : "Нажмите «Запись» и спойте в микрофон."
      }</p>
      <p class="hint" data-sing-timer hidden>Время вышло — запись всё равно можно сделать.</p>
      ${micError}
      <div class="actions" style="justify-content:center">
        <button class="btn btn-ghost" data-action="replay" ${state.locked || state.recording ? "disabled" : ""}>
          ${listenLabel}
        </button>
        ${recordBtn}
      </div>
      <p class="hint">Подсказка: ${escapeHtml(question.hint)}</p>
    </div>
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
  if (target.dataset.action === "sing") startQuiz("sing");
  if (target.dataset.action === "home") goHome();
  if (target.dataset.action === "leaderboard") openLeaderboard();
  if (target.dataset.action === "board-back") closeLeaderboard();
  if (target.dataset.action === "replay") playClip();
  if (target.dataset.action === "sing-record") startRecording();
  if (target.dataset.action === "sing-stop") stopRecording(true);
  if (target.dataset.action === "mic-retry") startRecording();
  if (target.dataset.choice && state.mode !== "sing") lockAnswer(target.dataset.choice);
});

if (!QUESTIONS.length && !INSTRUMENT_QUESTIONS.length && !COMPOSER_QUESTIONS.length && !SING_QUESTIONS.length) {
  state.screen = "empty";
}

render();
