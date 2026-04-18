import { makeAutoObservable, runInAction } from 'mobx'
import {
  getJuryContestView,
  type IParticipantCommentItem,
  putScoresBatch,
  submitJuryContest,
  type IJuryContestView,
  type IScoreItem,
} from '@/entities/contest'
import {
  sortCriteriaRows,
  sortParticipantsRows,
  weightedTotalsForJury,
} from '@/shared/lib/weightedScores.js'

class JuryContestStore {
  view: IJuryContestView | null = null
  draftScores = new Map<string, number>()
  draftComments = new Map<number, string>()
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
    this.draftComments.clear()
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
        this.draftComments.clear()
        response.data.myScores.forEach((item) => {
          this.draftScores.set(this.getKey(item.participantId, item.criterionId), item.value)
        })
        response.data.myComments.forEach((item) => {
          this.draftComments.set(item.participantId, item.comment || '')
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

  /** Если оценка ещё не вводилась, подставляем нижнюю границу критерия */
  getScore(participantId: number, criterionId: number, defaultValue = 0) {
    const key = this.getKey(participantId, criterionId)
    if (this.draftScores.has(key)) return this.draftScores.get(key)!
    return defaultValue
  }

  setComment(participantId: number, comment: string) {
    this.draftComments.set(participantId, comment.slice(0, 500))
  }

  getComment(participantId: number) {
    return this.draftComments.get(participantId) ?? ''
  }

  getParticipantAverage(participantId: number) {
    if (!this.view) return 0
    const n = this.view.criteria.length
    if (n === 0) return 0

    if (!this.view.contest.useCriteriaWeights) {
      const sum = this.view.criteria.reduce((acc, criterion) => {
        const lo = criterion.minScore ?? 0
        return acc + this.getScore(participantId, criterion.id, lo)
      }, 0)
      return Number((sum / n).toFixed(1))
    }

    const criteriaSorted = sortCriteriaRows(this.view.criteria)
    const participantsSorted = sortParticipantsRows(this.view.participants)
    const totals = weightedTotalsForJury({
      criteriaSorted,
      participantsSorted,
      getRawScore: (criterionId, pId) => {
        const lo = this.view!.criteria.find((c) => c.id === criterionId)?.minScore ?? 0
        return this.getScore(pId, criterionId, lo)
      },
    })
    const idx = participantsSorted.findIndex((p) => p.id === participantId)
    if (idx < 0) return 0
    return Number((totals[idx] ?? 0).toFixed(1))
  }

  buildPayload(): IScoreItem[] {
    if (!this.view) return []
    return this.view.participants.flatMap((participant) =>
      this.view!.criteria.map((criterion) => ({
        participantId: participant.id,
        criterionId: criterion.id,
        value: this.getScore(participant.id, criterion.id, criterion.minScore ?? 0),
      })),
    )
  }

  buildCommentsPayload(): IParticipantCommentItem[] {
    if (!this.view) return []
    return this.view.participants.map((participant) => ({
      participantId: participant.id,
      comment: this.getComment(participant.id),
    }))
  }

  async save(contestId: number) {
    this.isSaving = true
    this.error = null
    try {
      await putScoresBatch(contestId, this.buildPayload(), this.buildCommentsPayload())
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
      await putScoresBatch(contestId, this.buildPayload(), this.buildCommentsPayload())
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
