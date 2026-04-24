import { evaluateObjects } from './evaluateObjects'

type CriterionRow = {
  id: number
  minScore?: number
  maxScore: number
  sortOrder?: number
}

type ParticipantRow = {
  id: number
}

/** Линейное приведение сырой оценки к диапазону 0-10 по границам критерия */
function scaleRawTo10(raw: number | string | null | undefined, minScore: number, maxScore: number) {
  const numericValue = Number(raw)
  if (!Number.isFinite(numericValue)) return 0
  if (maxScore <= minScore) return 0
  const normalizedValue = ((numericValue - minScore) / (maxScore - minScore)) * 10
  return Math.max(0, Math.min(10, normalizedValue))
}

/** Верхняя граница итога (округления по показателям могут дать чуть больше maxScale) */
const MAX_SUM_TOTAL = 10

/** Сумма вкладов показателей по каждому объекту (участнику) */
function sumIndicatorScores(
  indicators: Array<{ scores: number[] }>,
  participantCount: number,
) {
  const totals = new Array<number>(participantCount).fill(0)
  for (let indicatorIndex = 0; indicatorIndex < indicators.length; indicatorIndex++) {
    const indicator = indicators[indicatorIndex]
    for (let participantIndex = 0; participantIndex < participantCount; participantIndex++) {
      totals[participantIndex] += indicator.scores[participantIndex]
    }
  }
  return totals.map((value) => Number(Math.min(value, MAX_SUM_TOTAL).toFixed(2)))
}

function weightedTotalsForJury({
  criteriaSorted,
  participantsSorted,
  getRawScore,
}: {
  criteriaSorted: CriterionRow[]
  participantsSorted: ParticipantRow[]
  getRawScore: (criterionId: number, participantId: number) => number | null | undefined
}) {
  const criteriaCount = criteriaSorted.length
  const participantCount = participantsSorted.length
  if (criteriaCount === 0 || participantCount === 0) {
    return {
      totals: new Array<number>(participantCount).fill(0),
      weights: [] as number[],
      weightsGridStep: null as number | null,
    }
  }

  const grades: number[][] = []
  for (let criterionIndex = 0; criterionIndex < criteriaCount; criterionIndex++) {
    const criterion = criteriaSorted[criterionIndex]
    const minScore = criterion.minScore ?? 0
    const maxScore = criterion.maxScore
    const row: number[] = []
    for (let participantIndex = 0; participantIndex < participantCount; participantIndex++) {
      const participant = participantsSorted[participantIndex]
      const rawScore = getRawScore(criterion.id, participant.id)
      const normalizedRaw = rawScore != null ? rawScore : minScore
      row.push(scaleRawTo10(normalizedRaw, minScore, maxScore))
    }
    grades.push(row)
  }

  const priorities = criteriaSorted.map((_, index) => index + 1)
  const { indicators, weightsGridStep } = evaluateObjects({ grades, priorities, maxScale: 10 })
  const totals = sumIndicatorScores(indicators, participantCount)
  const weights = indicators.map((indicator) => indicator.weight)
  return { totals, weights, weightsGridStep }
}

function sortCriteriaRows<T extends { id: number; sortOrder?: number | null }>(criteria: T[]) {
  return [...criteria].sort((firstCriteria, secondCriteria) => {
    const sortOrderDiff = (firstCriteria.sortOrder ?? 0) - (secondCriteria.sortOrder ?? 0)
    if (sortOrderDiff !== 0) return sortOrderDiff
    return firstCriteria.id - secondCriteria.id
  })
}

/** Упорядочить критерии по списку id жюри; хвост - по sortOrder. */
function orderCriteriaForJury<T extends { id: number; sortOrder?: number | null }>(
  criteria: T[],
  criterionOrderIds: number[] | null | undefined,
) {
  const sortedDefault = sortCriteriaRows(criteria)
  if (!criterionOrderIds || !Array.isArray(criterionOrderIds) || criterionOrderIds.length === 0) {
    return sortedDefault
  }
  const criteriaById = new Map(sortedDefault.map((criteriaItem) => [criteriaItem.id, criteriaItem]))
  const orderedCriteria: T[] = []
  const uniqueCriterionIds = new Set<number>()
  for (const rawCriterionId of criterionOrderIds) {
    const criterionId = Number(rawCriterionId)
    const criterion = criteriaById.get(criterionId)
    if (criterion && !uniqueCriterionIds.has(criterionId)) {
      orderedCriteria.push(criterion)
      uniqueCriterionIds.add(criterionId)
    }
  }
  for (const criterion of sortedDefault) {
    if (!uniqueCriterionIds.has(criterion.id)) orderedCriteria.push(criterion)
  }
  return orderedCriteria
}

function sortParticipantsRows<T extends { id: number }>(participants: T[]) {
  return [...participants].sort((firstParticipant, secondParticipant) => firstParticipant.id - secondParticipant.id)
}

export {
  scaleRawTo10,
  weightedTotalsForJury,
  sortCriteriaRows,
  orderCriteriaForJury,
  sortParticipantsRows,
}
