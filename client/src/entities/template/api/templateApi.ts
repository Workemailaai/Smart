import { axiosInstance, type ServerResponseType } from '@/shared'
import type { ITemplate } from '../model/template.types'

export const getTemplates = async (): Promise<ServerResponseType<ITemplate[]>> => {
  try {
    const response = await axiosInstance.get('/templates')
    return response.data
  } catch (error) {
    throw new Error((error as Error)?.message || 'Ошибка при получении шаблонов')
  }
}
