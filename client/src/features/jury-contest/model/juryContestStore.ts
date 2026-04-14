import { makeAutoObservable, runInAction } from 'mobx'
import {
  getJuryContestView,
  putScoresBatch,
  submitJuryContest,
  type IJuryContestView,
  type IScoreItem,
} from '@/entities/contest'

class JuryContestStore {
  view: IJuryContestView | null = null
  draftScores = new Map<string, number>()
  isLoading = false
  isSaving = false
  isSubmitting = false
  error: string | null = null

  constructor() {
    makeAutoObservable(this)
  }

  reset() {
    this.view = null
    this.draftScores.clear()
    this.error = null
  }

  async loadContest(contestId: number) {
    this.isLoading = true
    this.error = null
    try {
      const response = await getJuryContestView(contestId)
      runInAction(() => {
        this.view = response.data
        this.draftScores.clear()
        response.data.myScores.forEach((item) => {
          this.draftScores.set(this.getKey(item.participantId, item.criterionId), item.value)
        })
      })
    } catch (error) {
      runInAction(() => {
        this.error = (error as Error)?.message || 'Не удалось загрузить мероприятие'
      })
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  getKey(participantId: number, criterionId: number) {
    return `${participantId}_${criterionId}`
  }

  setScore(participantId: number, criterionId: number, value: number) {
    this.draftScores.set(this.getKey(participantId, criterionId), value)
  }

  getScore(participantId: number, criterionId: number) {
    return this.draftScores.get(this.getKey(participantId, criterionId)) ?? 0
  }

  getParticipantAverage(participantId: number) {
    if (!this.view) return 0
    if (this.view.criteria.length === 0) return 0
    const sum = this.view.criteria.reduce((acc, criterion) => {
      return acc + this.getScore(participantId, criterion.id)
    }, 0)
    return Number((sum / this.view.criteria.length).toFixed(1))
  }

  buildPayload(): IScoreItem[] {
    if (!this.view) return []
    return this.view.participants.flatMap((participant) =>
      this.view!.criteria.map((criterion) => ({
        participantId: participant.id,
        criterionId: criterion.id,
        value: this.getScore(participant.id, criterion.id),
      })),
    )
  }

  async save(contestId: number) {
    this.isSaving = true
    this.error = null
    try {
      await putScoresBatch(contestId, this.buildPayload())
    } catch (error) {
      runInAction(() => {
        this.error = (error as Error)?.message || 'Не удалось сохранить оценки'
      })
    } finally {
      runInAction(() => {
        this.isSaving = false
      })
    }
  }

  async submit(contestId: number) {
    this.isSubmitting = true
    this.error = null
    try {
      await putScoresBatch(contestId, this.buildPayload())
      await submitJuryContest(contestId)
      await this.loadContest(contestId)
    } catch (error) {
      runInAction(() => {
        this.error = (error as Error)?.message || 'Не удалось отправить оценки'
      })
    } finally {
      runInAction(() => {
        this.isSubmitting = false
      })
    }
  }
}

export const juryContestStore = new JuryContestStore()
