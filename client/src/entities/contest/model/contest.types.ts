export interface IContest {
  id: number
  title: string
  description: string | null
  organizerId: number
  contestType: string
  coverImageUrl: string | null
  status: ContestStatus
  completedAt: string | null
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

export type ContestStatus = 'in_progress' | 'judging_completed' | 'completed' | 'archived'

export interface ICriterion {
  id: number
  name: string
  maxScore: number
}

export interface IParticipant {
  id: number
  fullName: string
  age: number
  country: string | null
  photoUrl: string | null
}

export interface IScoreItem {
  participantId: number
  criterionId: number
  value: number
}

export interface IJuryContestView {
  contest: IContest
  criteria: ICriterion[]
  participants: IParticipant[]
  myScores: IScoreItem[]
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
  total: number
  criteria: {
    criterionId: number
    name: string
    maxScore: number
    value: number | null
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
  age: number
  country: string | null
  photoUrl: string | null
  score: number
  place: number
}

export interface IContestResultsView {
  contest: Pick<IContest, 'id' | 'title' | 'coverImageUrl' | 'status'>
  topThree: IContestResultsParticipant[]
  others: IContestResultsParticipant[]
}
