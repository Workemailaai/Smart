const { evaluateObjects } = require("../utils/evaluateObjects");

/** Линейное приведение сырой оценки к диапазону 0…10 по границам критерия */
function scaleRawTo10(raw, minS, maxS) {
  const v = Number(raw);
  if (!Number.isFinite(v)) return 0;
  if (maxS <= minS) return 0;
  const t = ((v - minS) / (maxS - minS)) * 10;
  return Math.max(0, Math.min(10, t));
}

/** Верхняя граница итога (округления по показателям могут дать чуть больше maxScale) */
const MAX_SUM_TOTAL = 10;

/** Сумма вкладов показателей по каждому объекту (участнику) */
function sumIndicatorScores(indicators, participantCount) {
  const totals = new Array(participantCount).fill(0);
  for (let i = 0; i < indicators.length; i++) {
    const ind = indicators[i];
    for (let j = 0; j < participantCount; j++) {
      totals[j] += ind.scores[j];
    }
  }
  return totals.map((x) => Number(Math.min(x, MAX_SUM_TOTAL).toFixed(2)));
}

/**
 * Итоговые взвешенные баллы по участникам для одного члена жюри.
 * @param {object} p
 * @param {Array<{ id: number, minScore?: number, maxScore: number }>} p.criteriaSorted — по sortOrder
 * @param {Array<{ id: number }>} p.participantsSorted — по id
 * @param {(criterionId: number, participantId: number) => number | null | undefined} p.getRawScore
 */
function weightedTotalsForJury({ criteriaSorted, participantsSorted, getRawScore }) {
  const n = criteriaSorted.length;
  const m = participantsSorted.length;
  if (n === 0 || m === 0) return new Array(m).fill(0);

  const grades = [];
  for (let i = 0; i < n; i++) {
    const crit = criteriaSorted[i];
    const minS = crit.minScore ?? 0;
    const maxS = crit.maxScore;
    const row = [];
    for (let j = 0; j < m; j++) {
      const p = participantsSorted[j];
      const raw = getRawScore(crit.id, p.id);
      const value = raw != null && raw !== "" ? raw : minS;
      row.push(scaleRawTo10(value, minS, maxS));
    }
    grades.push(row);
  }

  const priorities = criteriaSorted.map((_, idx) => idx + 1);
  const { indicators } = evaluateObjects({ grades, priorities, maxScale: 10 });
  return sumIndicatorScores(indicators, m);
}

function sortCriteriaRows(criteria) {
  return [...criteria].sort((a, b) => {
    const so = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
    if (so !== 0) return so;
    return a.id - b.id;
  });
}

function sortParticipantsRows(participants) {
  return [...participants].sort((a, b) => a.id - b.id);
}

module.exports = {
  scaleRawTo10,
  weightedTotalsForJury,
  sortCriteriaRows,
  sortParticipantsRows
};
