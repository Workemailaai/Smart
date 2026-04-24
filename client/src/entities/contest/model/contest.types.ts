export interface IContest {
  id: number
  title: string
  description: string | null
  organizerId: number
  contestType: string
  coverImageUrl: string | null
  status: ContestStatus
  completedAt: string | null
  /** Взвешенные показатели (новые мероприятия); старые — false */
  useCriteriaWeights?: boolean
  /** Жюри может задать порядок показателей перед оцениванием */
  juryPreferencesEnabled?: boolean
  mySubmitted?: boolean
  submittedJuryCount?: number
  totalJuryCount?: number
  createdAt: string
  updatedAt: string
}

export interface IContestTypeOption {
  id: string
  label: string
}

export type ContestStatus = 'in_progress' | 'judging_completed' | 'completed'

export interface ICriterion {
  id: number
  name: string
  /** Нижняя допустимая оценка по критерию (до миграции может отсутствовать — тогда 0) */
  minScore?: number
  maxScore: number
  /** Порядок значимости (1 — важнее), задаётся при создании мероприятия */
  sortOrder?: number
}

export interface IParticipant {
  id: number
  fullName: string
  extraInfo: string | null
  country: string | null
  photoUrl: string | null
}

export interface IScoreItem {
  participantId: number
  criterionId: number
  value: number
}

export interface IParticipantCommentItem {
  participantId: number
  comment: string
}

export interface IJuryContestView {
  contest: IContest
  criteria: ICriterion[]
  /** Индивидуальный порядок id критериев для текущего жюри (приоритет для взвешенного расчёта) */
  myCriterionOrder?: number[] | null
  participants: IParticipant[]
  myScores: IScoreItem[]
  myComments: IParticipantCommentItem[]
  averageByParticipant: { participantId: number; average: number }[]
  mySubmitted: boolean
}

export interface IOrganizerJuryCard {
  juryId: number
  userId: number
  fullName: string
  phone: string
  position: string | null
  photoUrl: string | null
  comment: string
  /** Шаг сетки перебора весов (accuracy) в методике */
  weightsGridStep?: number | null
  total: number
  criteria: {
    criterionId: number
    name: string
    minScore?: number
    maxScore: number
    value: number | null
    /** Доля в методике взвешенного расчёта (сумма по показателям ≈ 1); только при useCriteriaWeights */
    weight?: number | null
  }[]
}

export interface IOrganizerParticipantView extends IParticipant {
  juryCards: IOrganizerJuryCard[]
  overallTotal: number
  overallAverage: number
}

export interface IOrganizerContestView {
  contest: IContest
  participants: IOrganizerParticipantView[]
  canComplete: boolean
  submittedJuryCount: number
  totalJuryCount: number
}

export interface IContestResultsParticipant {
  participantId: number
  fullName: string
  extraInfo: string | null
  country: string | null
  photoUrl: string | null
  score: number | null
  place: number
}

export interface IContestResultsView {
  contest: Pick<IContest, 'id' | 'title' | 'coverImageUrl' | 'status' | 'createdAt' | 'updatedAt'>
  topThree: IContestResultsParticipant[]
  others: IContestResultsParticipant[]
}
