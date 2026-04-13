/** Критерий в шаблоне (каркас): нижняя граница оценки всегда 1 на бэкенде */
export interface ITemplateCriterion {
  name: string
  maxScore: number
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
      return { name: c, maxScore: 10 }
    }
    return { name: String(c.name || '').trim(), maxScore: Number(c.maxScore) || 10 }
  })
}
