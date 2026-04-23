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
      return averageWeights
    }
  }

  console.log(
    `Ошибка расчета весов: на фиксированной сетке шагов не найден допустимый набор весов. Ориентир 1/n=${(1 / parametersNumber).toFixed(6)}`,
  )
  throw new Error('Не удалось подобрать шаг для расчета весов')
}

function evaluateObjects({ grades, priorities, maxScale = 10 }: EvaluateObjectsParams): EvaluateObjectsResult {
  const parametersNumber = grades.length

  const sortedIndices = priorities
    .map((priority, index) => ({ priority, index }))
    .sort((first, second) => first.priority - second.priority)
    .map((item) => item.index)

  // Методика: строгие неравенства между весами соседних по приоритету показателей (p1 > p2 > ...), как в эталонном калькуляторе
  const filterConditions: FilterCondition[] = []
  for (let index = 0; index < sortedIndices.length - 1; index++) {
    filterConditions.push([sortedIndices[index], 1, sortedIndices[index + 1]])
  }

  const averageWeights = resolveAverageWeightsWithFallback({
    parametersNumber,
    filterConditions,
    maxScale,
  })

  const normalizedGrades = grades.map((row) => {
    const maxValue = Math.max(...row)
    return row.map((value) => value / maxValue)
  })

  const indicators = averageWeights.map((weight, weightIndex) => ({
    weight,
    scores: normalizedGrades[weightIndex].map((grade) => Math.round(grade * weight * maxScale * 100) / 100),
  }))

  return { indicators }
}

export { evaluateObjects, getGradesWithWeights }
