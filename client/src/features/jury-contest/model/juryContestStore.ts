import { makeAutoObservable, runInAction } from 'mobx'
import {
  getJuryContestView,
  type IParticipantCommentItem,
  putJuryCriteriaOrder,
  putScoresBatch,
  revokeJurySubmission,
  submitJuryContest,
  type IJuryContestView,
  type IScoreItem,
} from '@/entities/contest'
import {
  orderCriteriaForJury,
  sortCriteriaRows,
  sortParticipantsRows,
  weightedTotalsForJury,
} from '@/shared/lib/weightedScores'

class JuryContestStore {
  view: IJuryContestView | null = null
  draftScores = new Map<string, number>()
  draftComments = new Map<number, string>()
  isLoading = false
  isSubmitting = false
  isRevokingSubmission = false
  isRevoteMode = false
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
    this.isRevokingSubmission = false
    this.isRevoteMode = false
  }

  async loadContest(contestId: number, options?: { preserveDraft?: boolean }) {
    this.isLoading = true
    this.error = null
    const shouldPreserveDraft = Boolean(options?.preserveDraft)
    const previousDraftScores = shouldPreserveDraft ? new Map(this.draftScores) : null
    const previousDraftComments = shouldPreserveDraft ? new Map(this.draftComments) : null
    try {
      const response = await getJuryContestView(contestId)
      runInAction(() => {
        this.view = response.data
        const serverDraftScores = new Map<string, number>()
        const serverDraftComments = new Map<number, string>()
        response.data.myScores.forEach((scoreItem) => {
          serverDraftScores.set(this.getKey(scoreItem.participantId, scoreItem.criterionId), scoreItem.value)
        })
        response.data.myComments.forEach((commentItem) => {
          serverDraftComments.set(commentItem.participantId, commentItem.comment || '')
        })
        this.draftScores.clear()
        this.draftComments.clear()
        serverDraftScores.forEach((value, key) => {
          this.draftScores.set(key, value)
        })
        serverDraftComments.forEach((value, key) => {
          this.draftComments.set(key, value)
        })
        if (shouldPreserveDraft && previousDraftScores) {
          previousDraftScores.forEach((value, key) => {
            this.draftScores.set(key, value)
          })
        }
        if (shouldPreserveDraft && previousDraftComments) {
          previousDraftComments.forEach((value, key) => {
            this.draftComments.set(key, value)
          })
        }
        if (response.data.mySubmitted) {
          this.isRevoteMode = false
        }
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

  hasUnsavedEvaluationDraft() {
    if (!this.view) return false
    if (this.view.contest.status === 'completed') return false
    if (this.view.mySubmitted && !this.isRevoteMode) return false

    const serverScores = new Map<string, number>()
    this.view.myScores.forEach((scoreItem) => {
      serverScores.set(this.getKey(scoreItem.participantId, scoreItem.criterionId), scoreItem.value)
    })

    if (this.draftScores.size !== serverScores.size) {
      return true
    }

    for (const [scoreKey, scoreValue] of this.draftScores.entries()) {
      if (serverScores.get(scoreKey) !== scoreValue) {
        return true
      }
    }

    const serverComments = new Map<number, string>()
    this.view.myComments.forEach((commentItem) => {
      serverComments.set(commentItem.participantId, commentItem.comment || '')
    })

    if (this.draftComments.size !== serverComments.size) {
      return true
    }

    for (const [participantId, commentValue] of this.draftComments.entries()) {
      if ((serverComments.get(participantId) ?? '') !== commentValue) {
        return true
      }
    }

    return false
  }

  canRevote() {
    if (!this.view) return false
    return this.view.mySubmitted && this.view.contest.status !== 'completed' && !this.isRevoteMode
  }

  isScoreEditingLocked() {
    if (!this.view) return true
    if (this.view.contest.status === 'completed') return true
    if (this.isRevoteMode) return false
    return this.view.mySubmitted
  }

  async startRevote(contestId: number) {
    if (!this.view || this.view.contest.status === 'completed') return
    this.isRevokingSubmission = true
    this.error = null
    try {
      await revokeJurySubmission(contestId)
      runInAction(() => {
        this.isRevoteMode = true
      })
      await this.loadContest(contestId, { preserveDraft: true })
    } catch (error) {
      runInAction(() => {
        this.error = (error as Error)?.message || 'Не удалось включить режим переголосования'
      })
    } finally {
      runInAction(() => {
        this.isRevokingSubmission = false
      })
    }
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

    const criteriaSorted = orderCriteriaForJury(this.view.criteria, this.view.myCriterionOrder ?? null)
    const participantsSorted = sortParticipantsRows(this.view.participants)
    const { totals } = weightedTotalsForJury({
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

  async submit(contestId: number) {
    this.isSubmitting = true
    this.error = null
    try {
      await putScoresBatch(contestId, this.buildPayload(), this.buildCommentsPayload())
      await submitJuryContest(contestId)
      runInAction(() => {
        this.isRevoteMode = false
      })
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
