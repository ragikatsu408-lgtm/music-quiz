import "./style.css";
import { COMPOSER_QUESTIONS, INSTRUMENT_QUESTIONS, QUESTIONS, QUESTION_SECONDS, SING_QUESTIONS, scoreMessage } from "./questions.js";
import { detectPitch, formatHz, hzToNote, noteFreq, scoreNote, scorePhrase } from "./pitch.js";
import { fetchLeaderboard, getPlayerLabel, saveScore } from "./supabase.js";
import { escapeHtml, brand, formatDuration } from "./ui.js";
import { emptyQuestion, renderTeacherDash, renderTeacherEdit, renderTeacherResults, renderTeacherRoom } from "./screens-teacher.js";
import { renderRoleHome, renderStudentJoin } from "./screens-home.js";
import {
  classroomStatus,
  deleteQuiz,
  getRoomByCode,
  listAttempts,
  listQuizzes,
  listRooms,
  MODE_LABELS,
  saveAttempt,
  saveQuiz,
  startRoom,
} from "./classroom.js";
import { subscribeClassroom } from "./store.js";

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
  customDeck: [],
  roomId: "",
  roomCode: "",
  roomCodeInput: "",
  joinError: "",
  startedAt: 0,
  teacherQuizzes: [],
  teacherRooms: [],
  activeRoom: null,
  roomAttempts: [],
  editQuiz: null,
  editorError: "",
  timeSpentMs: 0,
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
  if (state.mode === "custom") return state.customDeck || [];
  if (state.mode === "picture") return INSTRUMENT_QUESTIONS;
  if (state.mode === "composer") return COMPOSER_QUESTIONS;
  if (state.mode === "sing") return SING_QUESTIONS;
  return QUESTIONS;
}

function questionSeconds() {
  const n = Number(currentQuestion()?.seconds);
  return Number.isFinite(n) && n > 0 ? n : QUESTION_SECONDS;
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
  const totalSec = questionSeconds();
  const progress = totalSec ? state.remaining / totalSec : 0;
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
  state.remaining = questionSeconds();
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
    question.kind === "note"
      ? scoreNote(collectedPitches, targetHz)
      : scorePhrase(collectedPitches, question.targetNotes);
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
    question.kind === "note"
      ? `Цель: ${question.targetNote} (${formatHz(targetHz)}). Услышали: ${state.heardLabel}, отклонение ${cents} центов.`
      : `Цель: ${question.targetNotes.join(" · ")}. Услышали: ${state.heardLabel}. Совпало нот: ${result.hits}/${result.need}.`;
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
  state.timeSpentMs = state.startedAt ? Date.now() - state.startedAt : 0;
  state.screen = "results";
  state.saveStatus = "saving";
  state.saveError = "";
  render();
  persistScore();
}

function roundPoints(score) {
  return score * 10;
}

async function persistScore() {
  const total = currentDeck().length || 1;
  const percent = Math.round((state.score / total) * 100);
  const timeSpent = state.timeSpentMs || 0;
  const missed = state.answers.filter((item) => !item.correct).map((item) => item.title);
  const classroom = classroomStatus();

  if (state.roomId) {
    try {
      await saveAttempt({
        room_id: state.roomId,
        player: state.playerName.trim() || "Игрок",
        score: state.score,
        total,
        percent,
        time_spent_ms: timeSpent,
        missed,
        answers: state.answers,
      });
      if (classroom.backend === "local" && classroom.error) {
        state.saveStatus = "error";
        state.saveError = classroom.error;
      } else {
        state.saveStatus = "saved";
        state.saveError = "";
      }
    } catch (error) {
      state.saveStatus = "error";
      state.saveError = error?.message || "Не удалось сохранить попытку. Она могла остаться только в этой вкладке.";
    }
    if (state.screen === "results") render();
    return;
  }

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
  if (mode === "picture" || mode === "composer" || mode === "sing" || mode === "custom") {
    state.mode = mode;
  } else {
    state.mode = "melody";
  }
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
  state.startedAt = Date.now();
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
  state.roomId = "";
  state.roomCode = "";
  state.customDeck = [];
  state.startedAt = 0;
  state.joinError = "";
  state.activeRoom = null;
  state.editQuiz = null;
  render();
}

function readJoinForm() {
  const name = app.querySelector("[data-field='player']");
  const code = app.querySelector("[data-field='room-code']");
  if (name) state.playerName = name.value;
  if (code) state.roomCodeInput = String(code.value || "").replace(/\D/g, "").slice(0, 6);
}

function normalizeCustomQuestion(question, index) {
  const choices = Array.isArray(question.choices) && question.choices.length
    ? question.choices.map((choice, i) => ({
        id: choice.id || ["a", "b", "c", "d"][i] || `c${i}`,
        text: String(choice.text || "").trim() || `Вариант ${i + 1}`,
      }))
    : [
        { id: "a", text: "A" },
        { id: "b", text: "B" },
        { id: "c", text: "C" },
        { id: "d", text: "D" },
      ];
  return {
    id: question.id || `q-${index + 1}`,
    prompt: question.prompt || "Что звучит?",
    title: question.title || question.prompt || `Вопрос ${index + 1}`,
    hint: question.hint || "Слушайте внимательно",
    audio: question.audio || "",
    image: question.image || "",
    imageAlt: question.imageAlt || "",
    seconds: Number(question.seconds) > 0 ? Number(question.seconds) : 15,
    choices,
    correctId: question.correctId || choices[0].id,
  };
}

async function joinRoom() {
  readJoinForm();
  if (!state.playerName.trim()) {
    state.joinError = "Введите имя.";
    render();
    return;
  }
  if (String(state.roomCodeInput || "").length !== 6) {
    state.joinError = "Код комнаты — шесть цифр.";
    render();
    return;
  }
  state.joinError = "";
  const room = await getRoomByCode(state.roomCodeInput);
  if (!room) {
    state.joinError =
      "Комната не найдена. Проверьте код. Если Supabase недоступен, учитель и ученик должны быть в одном браузере.";
    render();
    return;
  }
  state.roomId = room.id;
  state.roomCode = room.code;
  state.startedAt = Date.now();
  if (room.mode === "custom") {
    state.customDeck = (room.snapshot?.questions || []).map(normalizeCustomQuestion);
    startQuiz("custom");
    return;
  }
  startQuiz(room.mode);
}

async function refreshTeacherLists() {
  state.teacherQuizzes = await listQuizzes();
  state.teacherRooms = await listRooms();
}

async function openTeacher() {
  state.screen = "teacher";
  state.editQuiz = null;
  render();
  await refreshTeacherLists();
  if (state.screen === "teacher") render();
}

async function openTeacherResults(roomId) {
  const rooms = state.teacherRooms.length ? state.teacherRooms : await listRooms();
  const room = rooms.find((item) => item.id === roomId) || (state.activeRoom?.id === roomId ? state.activeRoom : null);
  if (!room) return;
  state.activeRoom = room;
  state.screen = "teacher-results";
  render();
  state.roomAttempts = await listAttempts(room.id);
  if (state.screen === "teacher-results") render();
}

async function launchRoom({ quiz, mode, title }) {
  const room = await startRoom({ quiz, mode, title });
  state.activeRoom = room;
  state.screen = "teacher-room";
  await refreshTeacherLists();
  render();
}

function openEditor(quiz) {
  state.editorError = "";
  state.editQuiz = quiz
    ? {
        id: quiz.id,
        title: quiz.title,
        created_at: quiz.created_at,
        questions: (quiz.questions || []).map((question, i) => normalizeCustomQuestion(question, i)),
      }
    : { title: "", questions: [emptyQuestion()] };
  state.screen = "teacher-edit";
  render();
}

function readEditor() {
  const quiz = state.editQuiz || { title: "", questions: [] };
  const titleEl = app.querySelector("[data-edit='title']");
  if (titleEl) quiz.title = titleEl.value;
  (quiz.questions || []).forEach((question, index) => {
    const prompt = app.querySelector(`[data-edit='prompt'][data-q='${index}']`);
    const audio = app.querySelector(`[data-edit='audio'][data-q='${index}']`);
    const seconds = app.querySelector(`[data-edit='seconds'][data-q='${index}']`);
    const correct = app.querySelector(`input[name='correct-${index}']:checked`);
    if (prompt) question.prompt = prompt.value;
    if (audio) question.audio = audio.value;
    if (seconds) question.seconds = Number(seconds.value) || 15;
    if (correct) question.correctId = correct.value;
    (question.choices || []).forEach((choice) => {
      const input = app.querySelector(
        `[data-edit='choice'][data-q='${index}'][data-choice='${choice.id}']`,
      );
      if (input) choice.text = input.value;
    });
  });
  state.editQuiz = quiz;
}

async function saveEditor() {
  readEditor();
  const quiz = state.editQuiz;
  if (!quiz.title?.trim()) {
    state.editorError = "Укажите название викторины.";
    render();
    return;
  }
  const questions = (quiz.questions || []).map(normalizeCustomQuestion).filter((q) => q.prompt.trim());
  if (!questions.length) {
    state.editorError = "Добавьте хотя бы один вопрос с формулировкой.";
    render();
    return;
  }
  if (questions.some((q) => q.choices.some((c) => !String(c.text || "").trim()))) {
    state.editorError = "Заполните все варианты ответа.";
    render();
    return;
  }
  await saveQuiz({ ...quiz, questions });
  await openTeacher();
}

function loadAudioFile(index, file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    readEditor();
    if (state.editQuiz?.questions?.[index]) {
      state.editQuiz.questions[index].audio = String(reader.result || "");
      render();
    }
  };
  reader.readAsDataURL(file);
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

function renderHome() {
  return renderRoleHome(state);
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
  const progress = state.remaining / questionSeconds();
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
      ? question.kind === "note"
        ? "Играет нота…"
        : question.kind === "song"
          ? "Играет песня…"
          : "Играет образец…"
      : question.kind === "note"
        ? "1. Слушать ноту"
        : question.kind === "song"
          ? "1. Слушать песню"
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
  const isNote = question.kind === "note";
  const isSong = question.kind === "song";
  const target = isNote
    ? `${question.targetNote} · ${formatHz(noteFreq(question.targetNote))}`
    : question.targetNotes.join(" · ");
  const steps = isNote
    ? "Сначала послушайте ноту, затем нажмите «2. Запись» и спойте её."
    : isSong
      ? "Сначала послушайте песню, затем спойте этот фрагмент сами."
      : "Нажмите «Запись» и спойте в микрофон.";
  const recordLabel = state.recording ? "Стоп" : isNote || isSong ? "2. Запись" : "Запись";
  const micError = state.micError
    ? `<div class="error-box" role="alert">${escapeHtml(state.micError)}
        <div class="actions" style="margin-top:10px">
          <button class="btn btn-ghost" data-action="mic-retry">Повторить</button>
        </div>
      </div>`
    : "";
  const recordBtn = state.recording
    ? `<button class="btn btn-primary" data-action="sing-stop">Стоп</button>`
    : `<button class="btn btn-primary" data-action="sing-record" ${state.locked ? "disabled" : ""}>${recordLabel}</button>`;
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
            : escapeHtml(steps)
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
  const total = currentDeck().length || 1;
  const percent = Math.round((state.score / total) * 100);
  const points = roundPoints(state.score);
  const timeLabel = formatDuration(state.timeSpentMs || 0);
  const recap = state.answers
    .map((item, i) => {
      const mark = item.timedOut ? "время" : item.correct ? "верно" : "ошибка";
      const color = item.correct ? "var(--mint)" : "var(--danger)";
      return `<li><span>${i + 1}. ${escapeHtml(item.title)}</span><span class="mark" style="color:${color}">${mark}</span></li>`;
    })
    .join("");

  const roomLine = state.roomCode
    ? `<p class="muted">Комната ${escapeHtml(state.roomCode)} · ${percent}% · ${points} баллов · ${escapeHtml(timeLabel)}</p>`
    : `<p class="muted">${escapeHtml(getPlayerLabel(state.playerName))} · ${state.score} из ${total} · ${points} баллов</p>`;

  return `
    ${brand()}
    <section class="card">
      <div class="score-hero">
        <div class="big">${state.score}/${total}</div>
        <h2>Итоги раунда</h2>
        <p class="lede">${escapeHtml(scoreMessage(state.score, total, state.mode))}</p>
        ${roomLine}
      </div>
      ${renderSaveNotice()}
      ${
        state.answers.length
          ? `<ul class="recap">${recap}</ul>`
          : `<div class="state"><p>Ответов пока нет — раунд оборвался до первого вопроса.</p></div>`
      }
      <div class="actions">
        <button class="btn btn-primary" data-action="${state.mode === "custom" ? "replay-custom" : replayAction()}">Сыграть ещё раз</button>
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
    return `<p class="save-note">Сохраняем результат…</p>`;
  }
  if (state.saveStatus === "saved") {
    return state.roomId
      ? `<p class="save-note ok">Результат записан. Учитель видит его на странице комнаты.</p>`
      : `<p class="save-note ok">Счёт сохранён в таблице scores.</p>`;
  }
  if (state.saveStatus === "error") {
    return `<div class="error-box" role="status">${escapeHtml(state.saveError)}</div>`;
  }
  return "";
}

function render() {
  const views = {
    quiz: renderQuiz,
    results: renderResults,
    leaderboard: renderLeaderboard,
    empty: renderEmpty,
    student: () => renderStudentJoin(state),
    teacher: () => renderTeacherDash(state),
    "teacher-room": () => renderTeacherRoom(state),
    "teacher-edit": () => renderTeacherEdit(state),
    "teacher-results": () => renderTeacherResults(state),
    home: renderHome,
  };
  const view = (views[state.screen] || renderHome)();
  app.innerHTML = `<main class="shell">${view}</main>`;
}

app.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action], [data-choice]");
  if (!target) return;
  const action = target.dataset.action;
  if (action === "start") startQuiz("melody");
  if (action === "picture") startQuiz("picture");
  if (action === "composer") startQuiz("composer");
  if (action === "sing") startQuiz("sing");
  if (action === "replay-custom") {
    state.startedAt = Date.now();
    startQuiz("custom");
  }
  if (action === "home") goHome();
  if (action === "leaderboard") openLeaderboard();
  if (action === "board-back") closeLeaderboard();
  if (action === "replay") playClip();
  if (action === "sing-record") startRecording();
  if (action === "sing-stop") stopRecording(true);
  if (action === "mic-retry") startRecording();
  if (action === "role-teacher") openTeacher();
  if (action === "role-student") {
    state.screen = "student";
    state.joinError = "";
    render();
  }
  if (action === "student-join") joinRoom();
  if (action === "quiz-new") openEditor(null);
  if (action === "quiz-edit") {
    const quiz = state.teacherQuizzes.find((item) => item.id === target.dataset.id);
    if (quiz) openEditor(quiz);
  }
  if (action === "quiz-delete") {
    deleteQuiz(target.dataset.id).then(() => openTeacher());
  }
  if (action === "quiz-add-q") {
    readEditor();
    state.editQuiz.questions.push(emptyQuestion());
    render();
  }
  if (action === "quiz-del-q") {
    readEditor();
    const index = Number(target.dataset.q);
    state.editQuiz.questions.splice(index, 1);
    if (!state.editQuiz.questions.length) state.editQuiz.questions.push(emptyQuestion());
    render();
  }
  if (action === "quiz-save") saveEditor();
  if (action === "room-start-quiz") {
    const quiz = state.teacherQuizzes.find((item) => item.id === target.dataset.id);
    if (quiz) launchRoom({ quiz, mode: "custom", title: quiz.title });
  }
  if (action === "room-start-mode") {
    const mode = target.dataset.mode;
    launchRoom({ mode, title: MODE_LABELS[mode] || mode });
  }
  if (action === "teacher-results") openTeacherResults(target.dataset.id);
  if (target.dataset.choice && state.mode !== "sing") lockAnswer(target.dataset.choice);
});

app.addEventListener("input", (event) => {
  const field = event.target.dataset.field;
  if (field === "player") state.playerName = event.target.value;
  if (field === "room-code") state.roomCodeInput = String(event.target.value || "").replace(/\D/g, "").slice(0, 6);
});

app.addEventListener("change", (event) => {
  const edit = event.target.dataset.edit;
  if (edit === "file") loadAudioFile(Number(event.target.dataset.q), event.target.files?.[0]);
});

subscribeClassroom(async () => {
  if (state.screen === "teacher") {
    await refreshTeacherLists();
    render();
  }
  if (state.screen === "teacher-results" && state.activeRoom) {
    state.roomAttempts = await listAttempts(state.activeRoom.id);
    render();
  }
  if (state.screen === "teacher-room") {
    await refreshTeacherLists();
  }
});

if (!QUESTIONS.length && !INSTRUMENT_QUESTIONS.length && !COMPOSER_QUESTIONS.length && !SING_QUESTIONS.length) {
  state.screen = "empty";
}

render();
