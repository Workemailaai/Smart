import { axiosInstance, type ServerResponseType } from '@/shared'
import type { ITemplate } from '../model/template.types'

export const getTemplateById = async (id: number): Promise<ServerResponseType<ITemplate>> => {
  try {
    const response = await axiosInstance.get(`/templates/${id}`)
    return response.data
  } catch (error) {
    throw new Error((error as Error)?.message || 'Ошибка при загрузке шаблона')
  }
}

export const getTemplates = async (): Promise<ServerResponseType<ITemplate[]>> => {
  try {
    const response = await axiosInstance.get('/templates')
    return response.data
  } catch (error) {
    throw new Error((error as Error)?.message || 'Ошибка при получении шаблонов')
  }
}

/** Сохранить каркас мероприятия как шаблон */
export const createTemplate = async (formData: FormData): Promise<ServerResponseType<ITemplate>> => {
  try {
    const response = await axiosInstance.post('/templates', formData)
    return response.data
  } catch (error) {
    const msg =
      (error as { response?: { data?: { error?: string } } })?.response?.data?.error ||
      (error as Error)?.message
    throw new Error(msg || 'Ошибка при сохранении шаблона')
  }
}
