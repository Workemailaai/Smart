/** Допустимые типы конкурса в конструкторе (id — латиница для API/БД) */
const CONTEST_TYPES = [
  "creative",
  "sports",
  "designers",
  "rating_objects",
  "student_work",
  "other"
];

const CONTEST_TYPE_LABELS = {
  creative: "Творческий конкурс",
  sports: "Спортивный конкурс",
  designers: "Конкурс дизайнеров",
  rating_objects: "Построение рейтинга объектов",
  student_work: "Оценка студенческих работ",
  other: "Другое"
};

module.exports = { CONTEST_TYPES, CONTEST_TYPE_LABELS };
