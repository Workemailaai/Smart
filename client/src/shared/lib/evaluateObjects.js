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
      return averageWeights;
    }
  }

  console.log(
    `Ошибка расчета весов: на фиксированной сетке шагов не найден допустимый набор весов. Ориентир 1/n=${(1 / parametersNumber).toFixed(6)}`
  );
  throw new Error("Не удалось подобрать шаг для расчета весов");
}

function evaluateObjects({ grades, priorities, maxScale = 10 }) {
  const parametersNumber = grades.length;

  const sortedIndices = priorities
    .map((p, i) => ({ p, i }))
    .sort((a, b) => a.p - b.p)
    .map((x) => x.i);

  // Методика: строгие неравенства между весами соседних по приоритету показателей (p₁ > p₂ > …), как в эталонном калькуляторе
  const filterConditions = [];
  for (let k = 0; k < sortedIndices.length - 1; k++) {
    filterConditions.push([sortedIndices[k], 1, sortedIndices[k + 1]]);
  }

  const averageWeights = resolveAverageWeightsWithFallback({
    parametersNumber,
    filterConditions,
    maxScale
  });

  const normalizedGrades = grades.map((row) => {
    const max = Math.max(...row);
    return row.map((v) => v / max);
  });

  const indicators = averageWeights.map((weight, i) => ({
    weight,
    scores: normalizedGrades[i].map((g) => Math.round(g * weight * maxScale * 100) / 100)
  }));

  return { indicators };
}

export { evaluateObjects, getGradesWithWeights };
