export interface IContest {
  id: number
  title: string
  description: string | null
  organizerId: number
  contestType: string
  coverImageUrl: string | null
  createdAt: string
  updatedAt: string
}

export interface IContestTypeOption {
  id: string
  label: string
}
