import { makeAutoObservable, runInAction } from 'mobx'
import { deleteTemplateById, getTemplates } from '../api/templateApi'
import type { ITemplate } from './template.types'

class TemplateStore {
  templates: ITemplate[] = []
  isLoading = false
  deletingTemplateId: number | null = null
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

  deleteTemplate = async (templateId: number) => {
    this.deletingTemplateId = templateId
    this.error = null
    try {
      await deleteTemplateById(templateId)
      runInAction(() => {
        this.templates = this.templates.filter((template) => template.id !== templateId)
      })
    } catch (error) {
      runInAction(() => {
        this.error = (error as Error)?.message || 'Ошибка при удалении шаблона'
      })
    } finally {
      runInAction(() => {
        this.deletingTemplateId = null
      })
    }
  }
}

export const templateStore = new TemplateStore()
