import { makeAutoObservable, runInAction } from 'mobx'
import { getTemplates } from '../api/templateApi'
import type { ITemplate } from './template.types'

class TemplateStore {
  templates: ITemplate[] = []
  isLoading = false
  error: string | null = null

  constructor() {
    makeAutoObservable(this)
  }

  fetchTemplates = async () => {
    this.isLoading = true
    this.error = null
    try {
      const response = await getTemplates()
      runInAction(() => {
        this.templates = response.data ?? []
      })
    } catch (error) {
      runInAction(() => {
        this.error = (error as Error)?.message || 'Ошибка при получении шаблонов'
      })
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }
}

export const templateStore = new TemplateStore()
