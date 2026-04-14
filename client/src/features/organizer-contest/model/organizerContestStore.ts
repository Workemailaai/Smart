import { makeAutoObservable, runInAction } from 'mobx'
import {
  completeContest,
  getOrganizerContestView,
  type IOrganizerContestView,
} from '@/entities/contest'

class OrganizerContestStore {
  view: IOrganizerContestView | null = null
  isLoading = false
  isCompleting = false
  error: string | null = null

  constructor() {
    makeAutoObservable(this)
  }

  reset() {
    this.view = null
    this.error = null
  }

  async loadContest(contestId: number) {
    this.isLoading = true
    this.error = null
    try {
      const response = await getOrganizerContestView(contestId)
      runInAction(() => {
        this.view = response.data
      })
    } catch (error) {
      runInAction(() => {
        this.error = (error as Error)?.message || 'Не удалось загрузить данные мероприятия'
      })
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async complete(contestId: number) {
    this.isCompleting = true
    this.error = null
    try {
      await completeContest(contestId)
      await this.loadContest(contestId)
    } catch (error) {
      runInAction(() => {
        this.error = (error as Error)?.message || 'Не удалось завершить мероприятие'
      })
    } finally {
      runInAction(() => {
        this.isCompleting = false
      })
    }
  }
}

export const organizerContestStore = new OrganizerContestStore()
