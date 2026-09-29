const slides = [
  {
    kicker: "Риторика · поэзия · речь",
    toc: "Титул",
    html: `
      <section class="slide">
        <p class="eyebrow">Лекция-практикум</p>
        <h1>Поэтизация речи</h1>
        <div class="cover-ornament"></div>
        <p class="lede">Как заменить обыденные и деловые фразы цитатами, метафорами и аллюзиями из известной поэзии.</p>
      </section>
    `,
  },
  {
    kicker: "Содержание",
    toc: "Содержание",
    html: `
      <section class="slide">
        <p class="eyebrow">План</p>
        <h2>Две части одного навыка</h2>
        <ol class="agenda">
          <li>
            <span class="num">I</span>
            <div>
              <strong>Деловая речь</strong>
              <span>Риторические фигуры: метафора, анафора, антитеза, риторический вопрос — с парами «было / стало» и приёмом обыгрывания.</span>
            </div>
          </li>
          <li>
            <span class="num">II</span>
            <div>
              <strong>Повседневные выражения</strong>
              <span>Время, любовь, одиночество, трудности, надежда, прощание — обыденная фраза и поэтический вариант.</span>
            </div>
          </li>
        </ol>
      </section>
    `,
  },
  {
    kicker: "Часть 1",
    toc: "Часть 1. Деловая речь",
    html: `
      <section class="slide">
        <p class="eyebrow">Часть первая</p>
        <h2>Деловая речь и риторические фигуры</h2>
        <p class="lede">Канцелярскую формулу можно не «украшать», а заменить узнаваемым поэтическим жестом — так тезис звучит точнее и запоминается.</p>
      </section>
    `,
  },
  {
    kicker: "Часть 1 · фигура",
    toc: "Метафора",
    html: figureSlide({
      title: "Метафора",
      was: "Мы не просто автоматизируем процессы, мы строим цифровой фундамент вашей компании.",
      became:
        "Здесь будет город заложен на зло надменному соседу…",
      cite: "А. Пушкин, «Медный всадник»",
      play: "Как писал классик, «здесь будет город заложен» — так и мы создаём не просто программу, а закладываем прочную основу вашего бизнеса на годы вперёд.",
    }),
  },
  {
    kicker: "Часть 1 · фигура",
    toc: "Анафора",
    html: figureSlide({
      title: "Анафора",
      was: "Мы знаем, чего хочет клиент. Мы знаем, как это сделать. Мы знаем, как быть первыми.",
      became:
        "Всё сущее — увековечить, безличное — вочеловечить, всё несбывшееся — воплотить!",
      cite: "А. Блок, «О, я хочу безумно жить…»",
      play: "Вслед за Блоком мы ставим амбициозные цели: всё задуманное — реализовать, всё сложное — упростить, всё несбывшееся — воплотить в этом проекте.",
    }),
  },
  {
    kicker: "Часть 1 · фигура",
    toc: "Антитеза",
    html: figureSlide({
      title: "Антитеза",
      was: "Старые методы требуют недель работы, наше решение даёт результат за пару минут.",
      became: "А он, мятежный, просит бури, как будто в буре есть покой!",
      cite: "М. Лермонтов, «Парус»",
      play: "Вместо того чтобы, как в классическом «Парусе», искать покой там, где его нет, и терять недели на старые методы — мы предлагаем бурный рост и результат всего за пару минут.",
    }),
  },
  {
    kicker: "Часть 1 · фигура",
    toc: "Риторический вопрос",
    html: figureSlide({
      title: "Риторический вопрос",
      was: "Задумывались ли вы, сколько времени ваша команда теряет на рутинные задачи каждый день?",
      became: "Кому работать весело, вольготно на Руси?",
      cite: "Н. Некрасов, «Кому на Руси жить хорошо»",
      play: "Перефразируя Некрасова: кому работать весело и продуктивно в нашей компании? Тем, кто освободил свою команду от рутины и передал автоматизации.",
    }),
  },
  {
    kicker: "Часть 2",
    toc: "Часть 2. Повседневность",
    html: `
      <section class="slide">
        <p class="eyebrow">Часть вторая</p>
        <h2>Повседневные выражения</h2>
        <p class="lede">Чтобы сделать речь более поэтичной, глубокой и выразительной, можно заменять обыденные фразы цитатами, метафорами или аллюзиями из известной поэзии.</p>
      </section>
    `,
  },
  {
    kicker: "Часть 2 · тема",
    toc: "Время и суета",
    html: everydaySlide({
      title: "Время и суета",
      was: "Как быстро летит время, я ничего не успеваю!",
      lines: [
        { text: "Остановись, мгновенье! Ты прекрасно!", cite: "И. В. Гёте, «Фауст»" },
        { text: "И век уж близится к концу, а мы всё суетимся…", cite: "по мотивам А. Тарковского" },
      ],
    }),
  },
  {
    kicker: "Часть 2 · тема",
    toc: "Любовь и чувства",
    html: everydaySlide({
      title: "Любовь и чувства",
      was: "Я так сильно тебя люблю и не могу забыть.",
      lines: [
        {
          text: "Я вас любил так искренно, так нежно, как дай вам Бог любимой быть другим.",
          cite: "А. С. Пушкин",
        },
        { text: "Дыша духами и туманами, она сидит у окна…", cite: "А. Блок" },
      ],
    }),
  },
  {
    kicker: "Часть 2 · тема",
    toc: "Одиночество и раздумья",
    html: everydaySlide({
      title: "Одиночество и раздумья",
      was: "Мне нужно побыть одному и подумать о жизни.",
      lines: [
        {
          text: "Выхожу один я на дорогу; сквозь туман кремнистый путь блестит…",
          cite: "М. Ю. Лермонтов",
        },
      ],
    }),
  },
  {
    kicker: "Часть 2 · тема",
    toc: "Сложности и трудности",
    html: everydaySlide({
      title: "Сложности и трудности",
      was: "Жизнь — сложная штука, постоянно возникают проблемы.",
      lines: [
        { text: "Жизнь прожить — не поле перейти.", cite: "Б. Пастернак, «Гамлет»" },
      ],
    }),
  },
  {
    kicker: "Часть 2 · тема",
    toc: "Надежда и вера",
    html: everydaySlide({
      title: "Надежда и вера в будущее",
      was: "Всё обязательно наладится, надо верить в лучшее.",
      lines: [
        {
          text: "Если жизнь тебя обманет, не печалься, не сердись! В день уныния покорись: день веселья, верь, настанет.",
          cite: "А. С. Пушкин",
        },
      ],
    }),
  },
  {
    kicker: "Часть 2 · тема",
    toc: "Расставание",
    html: everydaySlide({
      title: "Расставание или прощание",
      was: "Нам пора прощаться, пока!",
      lines: [
        { text: "Прощай, и если навсегда, то навсегда прощай.", cite: "Дж. Г. Байрон" },
      ],
    }),
  },
  {
    kicker: "Финал",
    toc: "Заключение",
    html: `
      <section class="slide">
        <p class="eyebrow">На память</p>
        <h2>Не украшать — замещать</h2>
        <p class="lede">Сначала обыденная формула, затем точная цитата или аллюзия, затем одна фраза «как обыграть». Так деловая речь получает каркас фигур, а повседневная — чужой, уже выверенный ритм.</p>
        <div class="cover-ornament"></div>
        <p class="cite">Поэтизация речи</p>
      </section>
    `,
  },
];

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function figureSlide({ title, was, became, cite, play }) {
  return `
    <section class="slide">
      <p class="eyebrow">Риторическая фигура</p>
      <h2>${escapeHtml(title)}</h2>
      <div class="grid">
        <article class="card card--was">
          <span class="label">Было</span>
          <p>${escapeHtml(was)}</p>
        </article>
        <article class="card card--now">
          <span class="label">Стало</span>
          <p>${escapeHtml(became)}</p>
        </article>
      </div>
      <p class="cite">${escapeHtml(cite)}</p>
      <p class="play"><span class="label">Как обыграть</span>${escapeHtml(play)}</p>
    </section>
  `;
}

function everydaySlide({ title, was, lines }) {
  const alts = lines
    .map(
      (line) => `
        <article class="card card--now card--full">
          <span class="label">Поэтический вариант</span>
          <p>${escapeHtml(line.text)}</p>
          <p class="cite" style="margin:0.45rem 0 0">${escapeHtml(line.cite)}</p>
        </article>
      `,
    )
    .join("");

  return `
    <section class="slide">
      <p class="eyebrow">Повседневность</p>
      <h2>${escapeHtml(title)}</h2>
      <div class="grid">
        <article class="card card--was card--full">
          <span class="label">Было</span>
          <p>${escapeHtml(was)}</p>
        </article>
        ${alts}
      </div>
    </section>
  `;
}

const stage = document.getElementById("stage");
const kicker = document.getElementById("kicker");
const counter = document.getElementById("counter");
const fill = document.getElementById("progressFill");
const progress = document.getElementById("progress");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const toc = document.getElementById("toc");
const tocList = document.getElementById("tocList");
const tocClose = document.getElementById("tocClose");

let index = 0;
let touchX = null;

tocList.innerHTML = slides
  .map((slide, i) => `<li><button type="button" data-goto="${i}">${slide.toc}</button></li>`)
  .join("");

function render() {
  const slide = slides[index];
  stage.innerHTML = slide.html;
  kicker.textContent = slide.kicker;
  counter.textContent = `${String(index + 1).padStart(2, "0")} / ${String(slides.length).padStart(2, "0")}`;
  fill.style.width = `${((index + 1) / slides.length) * 100}%`;
  progress.setAttribute("aria-valuenow", String(index + 1));
  progress.setAttribute("aria-valuemax", String(slides.length));
  prevBtn.disabled = index === 0;
  nextBtn.disabled = index === slides.length - 1;
  history.replaceState(null, "", `#${index + 1}`);
}

function go(delta) {
  const next = Math.min(slides.length - 1, Math.max(0, index + delta));
  if (next === index) return;
  index = next;
  render();
}

function parseHash() {
  const n = Number(location.hash.replace("#", ""));
  if (Number.isInteger(n) && n >= 1 && n <= slides.length) index = n - 1;
}

parseHash();
render();

prevBtn.addEventListener("click", (event) => {
  event.stopPropagation();
  go(-1);
});
nextBtn.addEventListener("click", (event) => {
  event.stopPropagation();
  go(1);
});

stage.addEventListener("click", (event) => {
  if (event.target.closest("button")) return;
  const rect = stage.getBoundingClientRect();
  const left = event.clientX < rect.left + rect.width * 0.28;
  go(left ? -1 : 1);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "ArrowRight" || event.key === " " || event.key === "PageDown") {
    event.preventDefault();
    go(1);
  }
  if (event.key === "ArrowLeft" || event.key === "PageUp") {
    event.preventDefault();
    go(-1);
  }
  if (event.key === "Escape") {
    toc.hidden = !toc.hidden;
  }
  if (event.key === "Home") {
    index = 0;
    render();
  }
  if (event.key === "End") {
    index = slides.length - 1;
    render();
  }
});

stage.addEventListener("touchstart", (event) => {
  touchX = event.changedTouches[0].clientX;
}, { passive: true });

stage.addEventListener("touchend", (event) => {
  if (touchX == null) return;
  const dx = event.changedTouches[0].clientX - touchX;
  if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
  touchX = null;
}, { passive: true });

tocList.addEventListener("click", (event) => {
  const btn = event.target.closest("[data-goto]");
  if (!btn) return;
  index = Number(btn.dataset.goto);
  toc.hidden = true;
  render();
});

tocClose.addEventListener("click", () => {
  toc.hidden = true;
});

window.addEventListener("hashchange", () => {
  parseHash();
  render();
});
