/** Критерий в шаблоне (каркас) */
export interface ITemplateCriterion {
  name: string
  maxScore: number
  minScore?: number
}

export interface ITemplate {
  id: number
  name: string
  criteria: ITemplateCriterion[] | string[]
  contestType?: string
  organizerId: number
  createdAt: string
  updatedAt: string
}

export function normalizeTemplateCriteria(criteria: ITemplate['criteria']): ITemplateCriterion[] {
  if (!Array.isArray(criteria)) return []
  return criteria.map((c) => {
    if (typeof c === 'string') {
      return { name: c, minScore: 1, maxScore: 10 }
    }
    const minScore = Number(c.minScore)
    const maxScore = Number(c.maxScore) || 10
    return {
      name: String(c.name || '').trim(),
      minScore: Number.isFinite(minScore) && minScore >= 0 ? minScore : 1,
      maxScore,
    }
  })
}
