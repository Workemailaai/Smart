import { makeAutoObservable, runInAction } from 'mobx'
import {
  getJuryContestView,
  type IParticipantCommentItem,
  putJuryCriteriaOrder,
  putScoresBatch,
  submitJuryContest,
  type IJuryContestView,
  type IScoreItem,
} from '@/entities/contest'
import {
  orderCriteriaForJury,
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
  /** Сохранение порядка показателей на экране приоритетов */
  isSavingPriorityOrder = false
  error: string | null = null
  /** Порядок id критериев на шаге «Приоритет показателей» (drag-and-drop) */
  priorityDraftIds: number[] = []

  constructor() {
    makeAutoObservable(this)
  }

  reset() {
    this.view = null
    this.draftScores.clear()
    this.draftComments.clear()
    this.error = null
    this.priorityDraftIds = []
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
        this.syncPriorityDraftFromView()
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

  priorityStorageKey(userId: number, contestId: number) {
    return `smart_jury_priority_done_${userId}_${contestId}`
  }

  /** Показать экран расстановки приоритетов перед оцениванием */
  shouldShowCriteriaPriorityStep(userId: number): boolean {
    if (!this.view || this.view.mySubmitted) return false
    const { contest, criteria } = this.view
    if (
      !contest.juryPreferencesEnabled ||
      !contest.useCriteriaWeights ||
      criteria.length < 2
    ) {
      return false
    }
    if (typeof localStorage === 'undefined') return true
    return localStorage.getItem(this.priorityStorageKey(userId, contest.id)) !== '1'
  }

  syncPriorityDraftFromView() {
    if (!this.view) {
      this.priorityDraftIds = []
      return
    }
    const { criteria, myCriterionOrder } = this.view
    if (
      myCriterionOrder &&
      myCriterionOrder.length === criteria.length
    ) {
      this.priorityDraftIds = [...myCriterionOrder]
      return
    }
    this.priorityDraftIds = sortCriteriaRows(criteria).map((c) => c.id)
  }

  movePriorityCriterion(fromIndex: number, toIndex: number) {
    const n = this.priorityDraftIds.length
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= n || toIndex >= n) {
      return
    }
    const next = [...this.priorityDraftIds]
    const [id] = next.splice(fromIndex, 1)
    next.splice(toIndex, 0, id)
    this.priorityDraftIds = next
  }

  async confirmPriorityOrder(contestId: number, userId: number) {
    this.isSavingPriorityOrder = true
    this.error = null
    try {
      await putJuryCriteriaOrder(contestId, this.priorityDraftIds)
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.priorityStorageKey(userId, contestId), '1')
      }
      await this.loadContest(contestId)
    } catch (error) {
      runInAction(() => {
        this.error = (error as Error)?.message || 'Не удалось сохранить порядок показателей'
      })
    } finally {
      runInAction(() => {
        this.isSavingPriorityOrder = false
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
      return Number((sum / n).toFixed(2))
    }

    const criteriaSorted = orderCriteriaForJury(this.view.criteria, this.view.myCriterionOrder ?? null)
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
    return Number((totals[idx] ?? 0).toFixed(2))
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
