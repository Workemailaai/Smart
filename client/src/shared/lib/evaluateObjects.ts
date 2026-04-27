type ComparisonOperator = 1 | 2 | 3 | 4 | 5

type FilterCondition = [left: number, operator: ComparisonOperator, right: number]

type GetGradesWithWeightsParams = {
  parametersNumber: number
  gradeKits?: number[][]
  filterConditions?: FilterCondition[]
  maxScale?: number
  accuracy?: number
}

type GetGradesWithWeightsResult = {
  averageWeights: number[]
  averageGrades: number[]
}

type EvaluateObjectsParams = {
  grades: number[][]
  priorities: number[]
  maxScale?: number
}

type EvaluateObjectsResult = {
  indicators: Array<{
    weight: number
    scores: number[]
  }>
  /** Шаг сетки (accuracy), с которым подобраны веса */
  weightsGridStep: number
}

// Базовый шаг расчета весов по методике
const BASE_ACCURACY = 0.05
// Шаг сетки для fallback-поиска ближайшего допустимого значения
const ACCURACY_GRID_STEP = 0.005
// Нижняя граница сетки (0.005 => 0.05, 0.045, 0.04, ... , 0.005)
const MIN_ACCURACY = 0.005

function transposeArray(array: number[][], parametersNumber: number) {
  if (!Array.isArray(array) || array.length === 0 || !Array.isArray(array[0])) {
    return null
  }
  const transposed: number[][] = []
  for (let columnIndex = 0; columnIndex < array[0].length; columnIndex++) {
    const row: number[] = []
    for (let rowIndex = 0; rowIndex < array.length; rowIndex++) {
      row.push(array[rowIndex][columnIndex])
    }
    if (row.length !== parametersNumber) return null
    transposed.push(row)
  }
  return transposed
}

function divideRowsByMax(array: number[][]) {
  for (let rowIndex = 0; rowIndex < array.length; rowIndex++) {
    const maxValue = Math.max(...array[rowIndex])
    for (let columnIndex = 0; columnIndex < array[rowIndex].length; columnIndex++) {
      array[rowIndex][columnIndex] /= maxValue
    }
  }
  return array
}

function operationComparison(leftValue: number, operator: ComparisonOperator, rightValue: number) {
  switch (operator) {
    case 1:
      return leftValue > rightValue
    case 2:
      return leftValue < rightValue
    case 3:
      return leftValue >= rightValue
    case 4:
      return leftValue <= rightValue
    case 5:
      return leftValue === rightValue
    default:
      return false
  }
}

function passesFilter(weightKit: number[], filterConditions: FilterCondition[]) {
  for (let weightIndex = 0; weightIndex < weightKit.length; weightIndex++) {
    if (weightKit[weightIndex] <= 0) return false
  }
  for (const [left, operator, right] of filterConditions) {
    if (!operationComparison(weightKit[left], operator, weightKit[right])) return false
  }
  return true
}

function computeGrade(weightsKit: number[], gradeValues: number[][]) {
  return gradeValues.map((valueKit) => {
    let grade = 0
    for (let weightIndex = 0; weightIndex < weightsKit.length; weightIndex++) {
      grade += weightsKit[weightIndex] * valueKit[weightIndex]
    }
    return grade
  })
}

function getGradesWithWeights({
  parametersNumber,
  gradeKits = [],
  filterConditions = [],
  maxScale = 10,
  accuracy = BASE_ACCURACY,
}: GetGradesWithWeightsParams): GetGradesWithWeightsResult {
  let hasGrades = gradeKits.length > 0
  let gradeValues: number[][] = []

  if (hasGrades) {
    const gradeKitsCopy = gradeKits.map((row) => [...row])
    const transposed = transposeArray(divideRowsByMax(gradeKitsCopy), parametersNumber)
    if (!transposed) {
      hasGrades = false
    } else {
      gradeValues = transposed
    }
  }

  const decimalPlaces = accuracy.toString().includes('.')
    ? (accuracy.toString().split('.').pop()?.length ?? 0)
    : 0
  const scale = 10 ** decimalPlaces
  const integerSum = Math.round(1 * scale)
  const integerStep = Math.round(accuracy * scale)

  const kits: number[][] = []
  const current = new Array<number>(parametersNumber)

  function processKit(weightKit: number[]) {
    if (!passesFilter(weightKit, filterConditions)) return
    let kitArray = weightKit.slice(0)
    if (hasGrades) {
      kitArray = kitArray.concat(computeGrade(kitArray, gradeValues))
    }
    kitArray = kitArray.map((value) => Math.round((value / scale) * 100) / 100)
    kits.push(kitArray)
  }

  function recurse(remaining: number, index: number) {
    if (index === parametersNumber - 1) {
      if (remaining >= integerStep) {
        current[index] = remaining
        processKit(current)
      }
      return
    }
    const minForRest = integerStep * (parametersNumber - 1 - index)
    const maxValue = remaining - minForRest
    for (let value = integerStep; value <= maxValue; value += integerStep) {
      current[index] = value
      recurse(remaining - value, index + 1)
    }
  }

  recurse(integerSum, 0)

  let average: number[] = []
  if (kits.length > 0) {
    average = new Array<number>(kits[0].length).fill(0)
    kits.forEach((kit) => kit.forEach((value, valueIndex) => { average[valueIndex] += value }))
    average = average.map((value) => Math.round((value / kits.length) * 100) / 100)
  }

  return {
    averageWeights: average.slice(0, parametersNumber),
    averageGrades: average.slice(parametersNumber).map((value) => Math.round(value * maxScale * 100) / 100),
  }
}

function buildAccuracyGrid() {
  const accuracyValues: number[] = []
  for (
    let accuracyInt = Math.round(BASE_ACCURACY * 1000);
    accuracyInt >= Math.round(MIN_ACCURACY * 1000);
    accuracyInt -= Math.round(ACCURACY_GRID_STEP * 1000)
  ) {
    accuracyValues.push(accuracyInt / 1000)
  }
  return accuracyValues
}

function resolveAverageWeightsWithFallback({
  parametersNumber,
  filterConditions,
  maxScale,
}: {
  parametersNumber: number
  filterConditions: FilterCondition[]
  maxScale: number
}) {
  const accuracyGrid = buildAccuracyGrid()
  for (let accuracyIndex = 0; accuracyIndex < accuracyGrid.length; accuracyIndex++) {
    const accuracy = accuracyGrid[accuracyIndex]
    const { averageWeights } = getGradesWithWeights({
      parametersNumber,
      filterConditions,
      maxScale,
      accuracy,
    })
    const hasValidWeights =
      averageWeights.length === parametersNumber &&
      averageWeights.every((weight) => Number.isFinite(weight) && weight > 0)
    if (hasValidWeights) {
      return { averageWeights, usedAccuracy: accuracy }
    }
  }

  console.log(
    `Ошибка расчета весов: на фиксированной сетке шагов не найден допустимый набор весов. Ориентир 1/n=${(1 / parametersNumber).toFixed(6)}`,
  )
  throw new Error('Не удалось подобрать шаг для расчета весов')
}

/**
 * Ограничения на веса по позициям в упорядоченном списке приоритетов.
 * При 6+ показателях: позиции 1–3 — равные (максимальные), позиция 4 — отдельная,
 * позиции 5–6 — равные (ниже 4), далее строго по одному.
 * При 5 и менее показателях — цепочка строгих неравенств между соседними позициями.
 */
function buildWeightFilterConditionsFromSortedIndices(sortedIndices: number[]): FilterCondition[] {
  // число показателей в порядке убывания значимости (после сортировки по priority)
  const orderedCount = sortedIndices.length
  // условия для getGradesWithWeights (операторы 1 — «>», 5 — «==»)
  const conditions: FilterCondition[] = []
  if (orderedCount < 2) {
    return conditions
  }
  // группировка позиций применяется только при шести и более показателях
  const useGroupedTiers = orderedCount >= 6
  if (!useGroupedTiers) {
    for (let rankIndex = 0; rankIndex < orderedCount - 1; rankIndex++) {
      conditions.push([sortedIndices[rankIndex], 1, sortedIndices[rankIndex + 1]])
    }
    return conditions
  }
  // индексы строк матрицы оценок для позиций 1–3 (одинаковый вес, максимальный приоритет)
  const topFirst = sortedIndices[0]
  const topSecond = sortedIndices[1]
  const topThird = sortedIndices[2]
  // позиция 4 — отдельный вес ниже первой тройки
  const fourthRank = sortedIndices[3]
  // индексы для позиций 5–6 (одинаковый вес, ниже позиции 4)
  const fifthRank = sortedIndices[4]
  const sixthRank = sortedIndices[5]
  conditions.push([topFirst, 5, topSecond])
  conditions.push([topSecond, 5, topThird])
  conditions.push([fifthRank, 5, sixthRank])
  conditions.push([topFirst, 1, fourthRank])
  conditions.push([fourthRank, 1, fifthRank])
  for (let rankIndex = 5; rankIndex < orderedCount - 1; rankIndex++) {
    conditions.push([sortedIndices[rankIndex], 1, sortedIndices[rankIndex + 1]])
  }
  return conditions
}

function evaluateObjects({ grades, priorities, maxScale = 10 }: EvaluateObjectsParams): EvaluateObjectsResult {
  const parametersNumber = grades.length

  const sortedIndices = priorities
    .map((priority, index) => ({ priority, index }))
    .sort((first, second) => first.priority - second.priority)
    .map((item) => item.index)

  const filterConditions = buildWeightFilterConditionsFromSortedIndices(sortedIndices)

  const { averageWeights, usedAccuracy } = resolveAverageWeightsWithFallback({
    parametersNumber,
    filterConditions,
    maxScale,
  })

  // сумма усреднённых весов до нормализации (из-за округления наборов на сетке могла отличаться от 1)
  const averageWeightSum = averageWeights.reduce((partialSum, weight) => partialSum + weight, 0)
  // веса с суммой 1; пропорции и равенства внутри групп сохраняются
  const normalizedAverageWeights =
    averageWeightSum > 0
      ? averageWeights.map((weight) => weight / averageWeightSum)
      : averageWeights

  const normalizedGrades = grades.map((row) => {
    const maxValue = Math.max(...row)
    return row.map((value) => value / maxValue)
  })

  // веса до сотых; остаток суммы до 1 переносится на показатель с минимальным приоритетом (не трогая группы 1–3 и 4–5)
  const weightsRounded = normalizedAverageWeights.map((weight) => Math.round(weight * 100) / 100)
  // сумма округлённых весов до корректировки
  const roundedWeightsSum = weightsRounded.reduce((partialSum, value) => partialSum + value, 0)
  // доводка до суммы ровно 1.00 при накопленной ошибке округления
  const weightSumRemainder = Math.round((1 - roundedWeightsSum) * 100) / 100
  if (weightsRounded.length > 0 && weightSumRemainder !== 0) {
    // индекс показателя на последней позиции в упорядоченном списке значимости
    const lowestPriorityCriterionIndex = sortedIndices[sortedIndices.length - 1]
    weightsRounded[lowestPriorityCriterionIndex] =
      Math.round((weightsRounded[lowestPriorityCriterionIndex] + weightSumRemainder) * 100) / 100
  }

  const indicators = weightsRounded.map((weightRounded, weightIndex) => ({
    weight: weightRounded,
    scores: normalizedGrades[weightIndex].map(
      (grade) => Math.round(grade * weightRounded * maxScale * 100) / 100,
    ),
  }))

  return { indicators, weightsGridStep: usedAccuracy }
}

export { evaluateObjects, getGradesWithWeights }
