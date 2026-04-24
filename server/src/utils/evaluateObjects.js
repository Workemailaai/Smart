// Базовый шаг расчета весов по методике
const BASE_ACCURACY = 0.05;
// Шаг сетки для fallback-поиска ближайшего допустимого значения
const ACCURACY_GRID_STEP = 0.005;
// Нижняя граница сетки (0.005 => 0.05, 0.045, 0.04, ... , 0.005)
const MIN_ACCURACY = 0.005;

function transposeArray(array, parametersNumber) {
  if (!Array.isArray(array) || array.length === 0 || !Array.isArray(array[0])) {
    return null;
  }
  const transposed = [];
  for (let col = 0; col < array[0].length; col++) {
    const row = [];
    for (let r = 0; r < array.length; r++) {
      row.push(array[r][col]);
    }
    if (row.length !== parametersNumber) return null;
    transposed.push(row);
  }
  return transposed;
}

function divideRowsByMax(array) {
  for (let i = 0; i < array.length; i++) {
    const max = Math.max(...array[i]);
    for (let j = 0; j < array[i].length; j++) {
      array[i][j] /= max;
    }
  }
  return array;
}

function operationComparison(a, op, b) {
  switch (op) {
    case 1:
      return a > b;
    case 2:
      return a < b;
    case 3:
      return a >= b;
    case 4:
      return a <= b;
    case 5:
      return a == b;
    default:
      return false;
  }
}

function passesFilter(kit, filterConditions) {
  for (let i = 0; i < kit.length; i++) {
    if (kit[i] <= 0) return false;
  }
  for (const [left, op, right] of filterConditions) {
    if (!operationComparison(kit[left], op, kit[right])) return false;
  }
  return true;
}

function computeGrade(weightsKit, gradeValues) {
  return gradeValues.map((valuesKit) => {
    let grade = 0;
    for (let i = 0; i < weightsKit.length; i++) {
      grade += weightsKit[i] * valuesKit[i];
    }
    return grade;
  });
}

function getGradesWithWeights({
  parametersNumber,
  gradeKits = [],
  filterConditions = [],
  maxScale = 10,
  accuracy = BASE_ACCURACY
}) {
  let gradeExist = gradeKits.length > 0;
  let gradeValues = [];

  if (gradeExist) {
    const copy = gradeKits.map((row) => [...row]);
    const transposed = transposeArray(divideRowsByMax(copy), parametersNumber);
    if (!transposed) {
      gradeExist = false;
    } else {
      gradeValues = transposed;
    }
  }

  const decimalPlaces = accuracy.toString().includes(".")
    ? accuracy.toString().split(".").pop().length
    : 0;
  const scale = 10 ** decimalPlaces;
  const intSum = Math.round(1 * scale);
  const intStep = Math.round(accuracy * scale);

  const kits = [];
  const current = new Array(parametersNumber);

  function processKit(kit) {
    if (!passesFilter(kit, filterConditions)) return;
    let kitArray = kit.slice(0);
    if (gradeExist) {
      kitArray = kitArray.concat(computeGrade(kitArray, gradeValues));
    }
    kitArray = kitArray.map((v) => Math.round((v / scale) * 100) / 100);
    kits.push(kitArray);
  }

  function recurse(remaining, index) {
    if (index === parametersNumber - 1) {
      if (remaining >= intStep) {
        current[index] = remaining;
        processKit(current);
      }
      return;
    }
    const minForRest = intStep * (parametersNumber - 1 - index);
    const maxVal = remaining - minForRest;
    for (let val = intStep; val <= maxVal; val += intStep) {
      current[index] = val;
      recurse(remaining - val, index + 1);
    }
  }

  recurse(intSum, 0);

  let average = [];
  if (kits.length > 0) {
    average = new Array(kits[0].length).fill(0);
    kits.forEach((kit) => kit.forEach((v, i) => { average[i] += v; }));
    average = average.map((v) => Math.round((v / kits.length) * 100) / 100);
  }

  return {
    averageWeights: average.slice(0, parametersNumber),
    averageGrades: average.slice(parametersNumber).map((v) => Math.round(v * maxScale * 100) / 100)
  };
}

function buildAccuracyGrid() {
  const accuracyValues = [];
  for (let accuracyInt = Math.round(BASE_ACCURACY * 1000); accuracyInt >= Math.round(MIN_ACCURACY * 1000); accuracyInt -= Math.round(ACCURACY_GRID_STEP * 1000)) {
    accuracyValues.push(accuracyInt / 1000);
  }
  return accuracyValues;
}

function resolveAverageWeightsWithFallback({ parametersNumber, filterConditions, maxScale }) {
  const accuracyGrid = buildAccuracyGrid();
  for (let accuracyIndex = 0; accuracyIndex < accuracyGrid.length; accuracyIndex++) {
    const accuracy = accuracyGrid[accuracyIndex];
    const { averageWeights } = getGradesWithWeights({
      parametersNumber,
      filterConditions,
      maxScale,
      accuracy
    });
    const hasValidWeights =
      averageWeights.length === parametersNumber &&
      averageWeights.every((weight) => Number.isFinite(weight) && weight > 0);
    if (hasValidWeights) {
      return { averageWeights, usedAccuracy: accuracy };
    }
  }

  console.log(
    `Ошибка расчета весов: на фиксированной сетке шагов не найден допустимый набор весов. Ориентир 1/n=${(1 / parametersNumber).toFixed(6)}`
  );
  throw new Error("Не удалось подобрать шаг для расчета весов");
}

/**
 * Ограничения на веса по позициям в упорядоченном списке приоритетов.
 * При 6+ показателях: позиции 1–3 и 4–5 — равные веса внутри группы, ступени между группами и далее строго по одному.
 * Иначе — цепочка строгих неравенств между соседними позициями (прежняя методика).
 */
function buildWeightFilterConditionsFromSortedIndices(sortedIndices) {
  // число показателей в порядке убывания значимости (после сортировки по priority)
  const orderedCount = sortedIndices.length;
  // условия для getGradesWithWeights (операторы 1 — «>», 5 — «==»)
  const conditions = [];
  if (orderedCount < 2) {
    return conditions;
  }
  // группировка позиций 1–3 и 4–5 только при шести и более показателях
  const useGroupedTiers = orderedCount >= 6;
  if (!useGroupedTiers) {
    for (let rankIndex = 0; rankIndex < orderedCount - 1; rankIndex++) {
      conditions.push([sortedIndices[rankIndex], 1, sortedIndices[rankIndex + 1]]);
    }
    return conditions;
  }
  // индексы строк матрицы оценок для позиций 1–3 (одинаковый вес)
  const topFirst = sortedIndices[0];
  const topSecond = sortedIndices[1];
  const topThird = sortedIndices[2];
  // индексы для позиций 4–5 (одинаковый вес, ниже первой тройки)
  const midFirst = sortedIndices[3];
  const midSecond = sortedIndices[4];
  conditions.push([topFirst, 5, topSecond]);
  conditions.push([topSecond, 5, topThird]);
  conditions.push([midFirst, 5, midSecond]);
  conditions.push([topFirst, 1, midFirst]);
  conditions.push([midFirst, 1, sortedIndices[5]]);
  for (let rankIndex = 5; rankIndex < orderedCount - 1; rankIndex++) {
    conditions.push([sortedIndices[rankIndex], 1, sortedIndices[rankIndex + 1]]);
  }
  return conditions;
}

function evaluateObjects({ grades, priorities, maxScale = 10 }) {
  const parametersNumber = grades.length;

  const sortedIndices = priorities
    .map((p, i) => ({ p, i }))
    .sort((a, b) => a.p - b.p)
    .map((x) => x.i);

  const filterConditions = buildWeightFilterConditionsFromSortedIndices(sortedIndices);

  const { averageWeights, usedAccuracy } = resolveAverageWeightsWithFallback({
    parametersNumber,
    filterConditions,
    maxScale
  });

  // сумма усреднённых весов до нормализации (из-за округления наборов на сетке могла отличаться от 1)
  const averageWeightSum = averageWeights.reduce((partialSum, weight) => partialSum + weight, 0);
  // веса с суммой 1; пропорции и равенства внутри групп сохраняются
  const normalizedAverageWeights =
    averageWeightSum > 0
      ? averageWeights.map((weight) => weight / averageWeightSum)
      : averageWeights;

  const normalizedGrades = grades.map((row) => {
    const max = Math.max(...row);
    return row.map((v) => v / max);
  });

  // веса до сотых; остаток суммы до 1 переносится на показатель с минимальным приоритетом (не трогая группы 1–3 и 4–5)
  const weightsRounded = normalizedAverageWeights.map((weight) => Math.round(weight * 100) / 100);
  // сумма округлённых весов до корректировки
  const roundedWeightsSum = weightsRounded.reduce((partialSum, value) => partialSum + value, 0);
  // доводка до суммы ровно 1.00 при накопленной ошибке округления
  const weightSumRemainder = Math.round((1 - roundedWeightsSum) * 100) / 100;
  if (weightsRounded.length > 0 && weightSumRemainder !== 0) {
    // индекс показателя на последней позиции в упорядоченном списке значимости
    const lowestPriorityCriterionIndex = sortedIndices[sortedIndices.length - 1];
    weightsRounded[lowestPriorityCriterionIndex] =
      Math.round((weightsRounded[lowestPriorityCriterionIndex] + weightSumRemainder) * 100) / 100;
  }

  const indicators = weightsRounded.map((weightRounded, i) => ({
    weight: weightRounded,
    scores: normalizedGrades[i].map((g) => Math.round(g * weightRounded * maxScale * 100) / 100)
  }));

  return { indicators, weightsGridStep: usedAccuracy };
}

module.exports = { evaluateObjects, getGradesWithWeights };
