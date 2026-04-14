import { makeAutoObservable, runInAction } from 'mobx'
import { getContests } from '../api/contestApi'
import type { IContest } from './contest.types'

class ContestStore {
  contests: IContest[] = []
  isLoading = false
  error: string | null = null

  constructor() {
    makeAutoObservable(this)
  }

  get juryPendingContests() {
    return this.contests.filter((contest) => !contest.mySubmitted && contest.status !== 'archived')
  }

  get juryRatedContests() {
    return this.contests.filter((contest) => contest.mySubmitted)
  }

  get organizerInProgressContests() {
    return this.contests.filter(
      (contest) => contest.status === 'in_progress' || contest.status === 'judging_completed',
    )
  }

  get organizerCompletedContests() {
    return this.contests.filter((contest) => contest.status === 'completed')
  }

  get organizerArchivedContests() {
    return this.contests.filter((contest) => contest.status === 'archived')
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
}

export const contestStore = new ContestStore()
