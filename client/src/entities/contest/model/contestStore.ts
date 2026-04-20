import { makeAutoObservable, runInAction } from 'mobx'
import { deleteContest as deleteContestRequest, getContests } from '../api/contestApi'
import type { IContest } from './contest.types'

class ContestStore {
  contests: IContest[] = []
  isLoading = false
  error: string | null = null

  constructor() {
    makeAutoObservable(this)
  }

  get juryPendingContests() {
    return this.contests.filter((contest) => !contest.mySubmitted && contest.status === 'in_progress')
  }

  get juryRatedContests() {
    return this.contests.filter(
      (contest) =>
        Boolean(contest.mySubmitted) &&
        (contest.status === 'in_progress' || contest.status === 'judging_completed'),
    )
  }

  get juryCompletedContests() {
    return this.contests.filter((contest) => contest.status === 'completed')
  }

  get organizerInProgressContests() {
    return this.contests.filter((contest) => contest.status === 'in_progress')
  }

  get organizerReadyToPublishContests() {
    return this.contests.filter((contest) => contest.status === 'judging_completed')
  }

  get organizerCompletedContests() {
    return this.contests.filter((contest) => contest.status === 'completed')
  }

  fetchContests = async () => {
    this.isLoading = true
    this.error = null
    try {
      const response = await getContests()
      runInAction(() => {
        this.contests = response.data ?? []
      })
    } catch (error) {
      runInAction(() => {
        this.error = (error as Error)?.message || 'Ошибка при получении мероприятий'
      })
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  /** Удаление мероприятия на этапе оценивания (организатор). Бросает ошибку при неудаче — для UI. */
  deleteContest = async (id: number) => {
    this.error = null
    try {
      await deleteContestRequest(id)
      runInAction(() => {
        this.contests = this.contests.filter((c) => c.id !== id)
      })
    } catch (error) {
      const message = (error as Error)?.message || 'Не удалось удалить мероприятие'
      runInAction(() => {
        this.error = message
      })
      throw error
    }
  }
}

export const contestStore = new ContestStore()
