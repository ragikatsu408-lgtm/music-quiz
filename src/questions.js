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

export function scoreMessage(correct, total) {
  const ratio = total === 0 ? 0 : correct / total;
  if (ratio === 1) return "Идеальный слух. Все фрагменты угаданы.";
  if (ratio >= 0.75) return "Отличный результат. Концертмейстер аплодирует.";
  if (ratio >= 0.5) return "Хороший слух. Ещё один круг — и будет увереннее.";
  if (ratio > 0) return "Есть попадания. Переслушайте фрагменты и попробуйте снова.";
  return "Пока мимо. Включите звук, слушайте спокойно и начните заново.";
}
