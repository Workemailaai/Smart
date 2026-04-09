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
