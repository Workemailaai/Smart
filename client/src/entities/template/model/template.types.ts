/** Критерий в шаблоне (каркас) */
export interface ITemplateCriterion {
  name: string
  maxScore: number
  minScore?: number
}

export interface ITemplateParticipant {
  fullName: string
  extraInfo: string | null
  country: string | null
  photoUrl?: string | null
}

export interface ITemplateJuryMember {
  fullName: string
  phone: string
  position: string | null
  password: string
  photoUrl?: string | null
}

export interface ITemplateSnapshot {
  title: string
  contestType: string
  coverImageUrl: string | null
  useCriteriaWeights: boolean
  juryPreferencesEnabled: boolean
  criteria: ITemplateCriterion[]
  criteriaInequalities: Array<'gt' | 'eq' | 'gte'>
  participants: ITemplateParticipant[]
  jury: ITemplateJuryMember[]
}

export interface ITemplate {
  id: number
  name: string
  criteria: ITemplateCriterion[] | string[]
  contestType?: string
  snapshot?: ITemplateSnapshot
  organizerId: number
  createdAt: string
  updatedAt: string
}

export function normalizeTemplateCriteria(criteria: ITemplate['criteria'] | ITemplateCriterion[]): ITemplateCriterion[] {
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
