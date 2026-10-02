export const QUESTION_SECONDS = 15;

/** In-repo public-domain melody snippets (synthesized tones, no API). */
export const QUESTIONS = [
  {
    id: "ode-to-joy",
    prompt: "Какое это произведение?",
    audio: "/audio/ode-to-joy.wav",
    hint: "Симфония № 9",
    image: "/images/ode-to-joy.jpg",
    imageAlt: "Симфонический оркестр — Ода к радости",
    choices: [
      { id: "a", text: "Ода к радости — Бетховен" },
      { id: "b", text: "Лунная соната — Бетховен" },
      { id: "c", text: "Реквием — Моцарт" },
      { id: "d", text: "Времена года — Вивальди" },
    ],
    correctId: "a",
  },
  {
    id: "fur-elise",
    prompt: "Угадайте пьесу по мелодии",
    audio: "/audio/fur-elise.wav",
    hint: "Фортепиано, начало XIX века",
    image: "/images/fur-elise.jpg",
    imageAlt: "Рояль — К Элизе",
    choices: [
      { id: "a", text: "Ноктюрн cis-moll — Шопен" },
      { id: "b", text: "К Элизе — Бетховен" },
      { id: "c", text: "Грёзы любви — Лист" },
      { id: "d", text: "Арабеска № 1 — Дебюсси" },
    ],
    correctId: "b",
  },
  {
    id: "turkish-march",
    prompt: "Что звучит в этом фрагменте?",
    audio: "/audio/turkish-march.wav",
    hint: "Рондо из сонаты",
    image: "/images/turkish-march.jpg",
    imageAlt: "Фортепиано — Турецкий марш",
    choices: [
      { id: "a", text: "Марш Радецкого — Штраус" },
      { id: "b", text: "Венгерский танец № 5 — Брамс" },
      { id: "c", text: "Турецкий марш — Моцарт" },
      { id: "d", text: "Полонез A-dur — Шопен" },
    ],
    correctId: "c",
  },
  {
    id: "mountain-king",
    prompt: "Какой это сюжет в музыке?",
    audio: "/audio/mountain-king.wav",
    hint: "Сюита «Пер Гюнт»",
    image: "/images/mountain-king.jpg",
    imageAlt: "Оркестр — В пещере горного короля",
    choices: [
      { id: "a", text: "Полёт шмеля — Римский-Корсаков" },
      { id: "b", text: "Ночь на Лысой горе — Мусоргский" },
      { id: "c", text: "В пещере горного короля — Григ" },
      { id: "d", text: "Кармен. Хабанера — Бизе" },
    ],
    correctId: "c",
  },
  {
    id: "sugar-plum",
    prompt: "Из какого балета эта тема?",
    audio: "/audio/sugar-plum.wav",
    hint: "Челеста",
    image: "/images/sugar-plum.jpg",
    imageAlt: "Челеста — Танец феи Драже",
    choices: [
      { id: "a", text: "Танец феи Драже — Чайковский" },
      { id: "b", text: "Лебединое озеро — Чайковский" },
      { id: "c", text: "Болеро — Равель" },
      { id: "d", text: "Утро — Григ" },
    ],
    correctId: "a",
  },
  {
    id: "kalinka",
    prompt: "Какая это народная песня?",
    audio: "/audio/kalinka.wav",
    hint: "Русский фольклор",
    image: "/images/kalinka.jpg",
    imageAlt: "Балалайка — Калинка",
    choices: [
      { id: "a", text: "Катюша" },
      { id: "b", text: "Калинка" },
      { id: "c", text: "Подмосковные вечера" },
      { id: "d", text: "Ой, мороз, мороз" },
    ],
    correctId: "b",
  },
  {
    id: "yolochka",
    prompt: "Узнаёте детскую песню?",
    audio: "/audio/yolochka.wav",
    hint: "Новогодняя классика",
    image: "/images/yolochka.jpg",
    imageAlt: "Ёлочка и пианино — В лесу родилась ёлочка",
    choices: [
      { id: "a", text: "Пусть бегут неуклюже" },
      { id: "b", text: "Маленькой ёлочке холодно зимой" },
      { id: "c", text: "В лесу родилась ёлочка" },
      { id: "d", text: "Жили у бабуси два весёлых гуся" },
    ],
    correctId: "c",
  },
  {
    id: "toccata",
    prompt: "Какой органно-клавирный шедевр?",
    audio: "/audio/toccata.wav",
    hint: "Барокко",
    image: "/images/toccata.jpg",
    imageAlt: "Орган — Токката и фуга ре минор",
    choices: [
      { id: "a", text: "Токката и фуга ре минор — Бах" },
      { id: "b", text: "Мессия. Аллилуйя — Гендель" },
      { id: "c", text: "Канон ре мажор — Пахельбель" },
      { id: "d", text: "Ave Maria — Гуно / Бах" },
    ],
    correctId: "a",
  },
];

export function scoreMessage(correct, total, kind = "melody") {
  const ratio = total === 0 ? 0 : correct / total;
  if (kind === "sing") {
    if (ratio === 1) return "Чистый унисон. Можно на бис.";
    if (ratio >= 0.75) return "Хороший слух и голос. Ещё немного — и будет точно.";
    if (ratio >= 0.5) return "Есть попадания. Слушайте образец и тяните ровнее.";
    if (ratio > 0) return "Начало есть. Спойте ближе к микрофону и в ту же октаву.";
    return "Пока мимо. Послушайте образец ещё раз и попробуйте спокойнее.";
  }
  if (kind === "composer") {
    if (ratio === 1) return "Все портреты узнаны. Архив консерватории вами гордится.";
    if (ratio >= 0.75) return "Отличный глаз. Композиторы вам знакомы в лицо.";
    if (ratio >= 0.5) return "Неплохо. Смотрите на причёску, воротник и эпоху.";
    if (ratio > 0) return "Есть попадания. Сравните парики, бороды и костюмы.";
    return "Пока мимо. Вглядитесь в портрет и попробуйте снова.";
  }
  if (kind === "picture") {
    if (ratio === 1) return "Все инструменты узнаны с первого взгляда.";
    if (ratio >= 0.75) return "Отличный глаз. Оркестр вами доволен.";
    if (ratio >= 0.5) return "Неплохо. Ещё круг — и названия сядут лучше.";
    if (ratio > 0) return "Есть попадания. Смотрите на форму корпуса и клавиши.";
    return "Пока мимо. Вглядитесь в фото и попробуйте снова.";
  }
  if (ratio === 1) return "Идеальный слух. Все фрагменты угаданы.";
  if (ratio >= 0.75) return "Отличный результат. Концертмейстер аплодирует.";
  if (ratio >= 0.5) return "Хороший слух. Ещё один круг — и будет увереннее.";
  if (ratio > 0) return "Есть попадания. Переслушайте фрагменты и попробуйте снова.";
  return "Пока мимо. Включите звук, слушайте спокойно и начните заново.";
}

/** Picture-only rounds: guess the instrument. No audio. */
export const INSTRUMENT_QUESTIONS = [
  {
    id: "violin",
    prompt: "Какой это инструмент?",
    image: "/images/guess-violin.jpg",
    imageAlt: "Скрипка",
    hint: "Смычковые",
    choices: [
      { id: "a", text: "Скрипка" },
      { id: "b", text: "Альт" },
      { id: "c", text: "Виолончель" },
      { id: "d", text: "Контрабас" },
    ],
    correctId: "a",
  },
  {
    id: "guitar",
    prompt: "Какой это инструмент?",
    image: "/images/guess-guitar.jpg",
    imageAlt: "Акустическая гитара",
    hint: "Струнные щипковые",
    choices: [
      { id: "a", text: "Укулеле" },
      { id: "b", text: "Балалайка" },
      { id: "c", text: "Акустическая гитара" },
      { id: "d", text: "Мандолина" },
    ],
    correctId: "c",
  },
  {
    id: "flute",
    prompt: "Какой это инструмент?",
    image: "/images/guess-flute.jpg",
    imageAlt: "Флейта",
    hint: "Деревянные духовые",
    choices: [
      { id: "a", text: "Кларнет" },
      { id: "b", text: "Флейта" },
      { id: "c", text: "Гобой" },
      { id: "d", text: "Фагот" },
    ],
    correctId: "b",
  },
  {
    id: "trumpet",
    prompt: "Какой это инструмент?",
    image: "/images/guess-trumpet.jpg",
    imageAlt: "Труба",
    hint: "Медные духовые",
    choices: [
      { id: "a", text: "Валторна" },
      { id: "b", text: "Тромбон" },
      { id: "c", text: "Туба" },
      { id: "d", text: "Труба" },
    ],
    correctId: "d",
  },
  {
    id: "accordion",
    prompt: "Какой это инструмент?",
    image: "/images/guess-accordion.jpg",
    imageAlt: "Аккордеон",
    hint: "Клавиши и меха",
    choices: [
      { id: "a", text: "Аккордеон" },
      { id: "b", text: "Гармонь" },
      { id: "c", text: "Орга́н" },
      { id: "d", text: "Синтезатор" },
    ],
    correctId: "a",
  },
  {
    id: "harp",
    prompt: "Какой это инструмент?",
    image: "/images/guess-harp.jpg",
    imageAlt: "Арфа",
    hint: "Большой щипковый",
    choices: [
      { id: "a", text: "Лира" },
      { id: "b", text: "Арфа" },
      { id: "c", text: "Цитра" },
      { id: "d", text: "Гусли" },
    ],
    correctId: "b",
  },
  {
    id: "drum",
    prompt: "Какой это инструмент?",
    image: "/images/guess-drum.jpg",
    imageAlt: "Малый барабан",
    hint: "Ударные",
    choices: [
      { id: "a", text: "Литавры" },
      { id: "b", text: "Тарелки" },
      { id: "c", text: "Малый барабан" },
      { id: "d", text: "Ксилофон" },
    ],
    correctId: "c",
  },
  {
    id: "saxophone",
    prompt: "Какой это инструмент?",
    image: "/images/guess-saxophone.jpg",
    imageAlt: "Саксофон",
    hint: "Язычковый духовой",
    choices: [
      { id: "a", text: "Кларнет" },
      { id: "b", text: "Фагот" },
      { id: "c", text: "Английский рожок" },
      { id: "d", text: "Саксофон" },
    ],
    correctId: "d",
  },
];

/** Picture-only rounds: guess the composer. No audio. */
export const COMPOSER_QUESTIONS = [
  {
    id: "beethoven",
    prompt: "Кто изображён на портрете?",
    image: "/images/composer-beethoven.jpg",
    imageAlt: "Людвиг ван Бетховен",
    hint: "Венская классика",
    choices: [
      { id: "a", text: "Людвиг ван Бетховен" },
      { id: "b", text: "Йозеф Гайдн" },
      { id: "c", text: "Франц Шуберт" },
      { id: "d", text: "Роберт Шуман" },
    ],
    correctId: "a",
  },
  {
    id: "mozart",
    prompt: "Кто изображён на портрете?",
    image: "/images/composer-mozart.jpg",
    imageAlt: "Вольфганг Амадей Моцарт",
    hint: "XVIII век, Зальцбург",
    choices: [
      { id: "a", text: "Антонио Сальери" },
      { id: "b", text: "Вольфганг Амадей Моцарт" },
      { id: "c", text: "Георг Фридрих Гендель" },
      { id: "d", text: "Кристоф Виллибальд Глюк" },
    ],
    correctId: "b",
  },
  {
    id: "bach",
    prompt: "Кто изображён на портрете?",
    image: "/images/composer-bach.jpg",
    imageAlt: "Иоганн Себастьян Бах",
    hint: "Немецкое барокко",
    choices: [
      { id: "a", text: "Георг Филипп Телеман" },
      { id: "b", text: "Генрих Шютц" },
      { id: "c", text: "Иоганн Себастьян Бах" },
      { id: "d", text: "Дитрих Букстехуде" },
    ],
    correctId: "c",
  },
  {
    id: "tchaikovsky",
    prompt: "Кто изображён на портрете?",
    image: "/images/composer-tchaikovsky.jpg",
    imageAlt: "Пётр Ильич Чайковский",
    hint: "Русский романтизм",
    choices: [
      { id: "a", text: "Модест Мусоргский" },
      { id: "b", text: "Николай Римский-Корсаков" },
      { id: "c", text: "Александр Бородин" },
      { id: "d", text: "Пётр Ильич Чайковский" },
    ],
    correctId: "d",
  },
  {
    id: "chopin",
    prompt: "Кто изображён на портрете?",
    image: "/images/composer-chopin.jpg",
    imageAlt: "Фридерик Шопен",
    hint: "Фортепиано, XIX век",
    choices: [
      { id: "a", text: "Фридерик Шопен" },
      { id: "b", text: "Ференц Лист" },
      { id: "c", text: "Роберт Шуман" },
      { id: "d", text: "Феликс Мендельсон" },
    ],
    correctId: "a",
  },
  {
    id: "vivaldi",
    prompt: "Кто изображён на портрете?",
    image: "/images/composer-vivaldi.jpg",
    imageAlt: "Антонио Вивальди",
    hint: "Итальянское барокко",
    choices: [
      { id: "a", text: "Арканжело Корелли" },
      { id: "b", text: "Антонио Вивальди" },
      { id: "c", text: "Доменико Скарлатти" },
      { id: "d", text: "Джованни Перголези" },
    ],
    correctId: "b",
  },
  {
    id: "schubert",
    prompt: "Кто изображён на портрете?",
    image: "/images/composer-schubert.jpg",
    imageAlt: "Франц Шуберт",
    hint: "Вена, песни и рояль",
    choices: [
      { id: "a", text: "Карл Мария фон Вебер" },
      { id: "b", text: "Иоганнес Брамс" },
      { id: "c", text: "Франц Шуберт" },
      { id: "d", text: "Антон Брукнер" },
    ],
    correctId: "c",
  },
  {
    id: "verdi",
    prompt: "Кто изображён на портрете?",
    image: "/images/composer-verdi.jpg",
    imageAlt: "Джузеппе Верди",
    hint: "Итальянская опера",
    choices: [
      { id: "a", text: "Джоаккино Россини" },
      { id: "b", text: "Гаэтано Доницетти" },
      { id: "c", text: "Винченцо Беллини" },
      { id: "d", text: "Джузеппе Верди" },
    ],
    correctId: "d",
  },
];

/** Singing rounds: match a local reference tone or short opera phrase. */
export const SING_QUESTIONS = [
  {
    id: "sing-c4",
    kind: "note",
    prompt: "Спойте эту ноту",
    audio: "/audio/sing/c4.wav",
    hint: "До (C4). Можно соседнюю октаву — главное попасть в ноту.",
    targetNote: "C4",
    targetNotes: ["C4"],
    title: "Нота C4",
  },
  {
    id: "sing-e4",
    kind: "note",
    prompt: "Спойте эту ноту",
    audio: "/audio/sing/e4.wav",
    hint: "Ми (E4). Тяните ровно пару секунд.",
    targetNote: "E4",
    targetNotes: ["E4"],
    title: "Нота E4",
  },
  {
    id: "sing-a4",
    kind: "note",
    prompt: "Спойте эту ноту",
    audio: "/audio/sing/a4.wav",
    hint: "Ля (A4) — камертон 440 Гц.",
    targetNote: "A4",
    targetNotes: ["A4"],
    title: "Нота A4",
  },
  {
    id: "sing-figaro",
    kind: "phrase",
    prompt: "Спойте короткую оперную фразу",
    audio: "/audio/sing/figaro.wav",
    hint: "«Фигаро» — мотив из «Севильского цирюльника».",
    targetNote: "C5",
    targetNotes: ["C5", "G4", "E4", "C4"],
    title: "Фигаро",
  },
  {
    id: "sing-habanera",
    kind: "phrase",
    prompt: "Спойте короткую оперную фразу",
    audio: "/audio/sing/habanera.wav",
    hint: "Хабанера из «Кармен».",
    targetNote: "D4",
    targetNotes: ["D4", "C#4", "F4"],
    title: "Хабанера",
  },
  {
    id: "sing-donna",
    kind: "phrase",
    prompt: "Спойте короткую оперную фразу",
    audio: "/audio/sing/donna.wav",
    hint: "«La donna è mobile» — Риголетто.",
    targetNote: "A4",
    targetNotes: ["B4", "A4", "G#4", "C5"],
    title: "La donna è mobile",
  },
];
