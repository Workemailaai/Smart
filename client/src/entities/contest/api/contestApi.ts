import { axiosInstance, type ServerResponseType } from '@/shared'
import type { IContest, IContestTypeOption } from '../model/contest.types'

export const getContests = async (): Promise<ServerResponseType<IContest[]>> => {
  try {
    const response = await axiosInstance.get('/contests')
    return response.data
  } catch (error) {
    throw new Error((error as Error)?.message || 'Ошибка при получении мероприятий')
  }
}

/** Типы конкурса для конструктора (без авторизации) */
export const getContestTypes = async (): Promise<ServerResponseType<IContestTypeOption[]>> => {
  const response = await axiosInstance.get('/contests/meta/contest-types')
  return response.data
}

/** Создание мероприятия из конструктора (multipart) */
export const createContestFull = async (
  formData: FormData,
): Promise<ServerResponseType<IContest>> => {
  try {
    const response = await axiosInstance.post('/contests/create-full', formData)
    return response.data
  } catch (error) {
    const msg =
      (error as { response?: { data?: { error?: string; message?: string } } })?.response?.data
        ?.error ||
      (error as { response?: { data?: { message?: string } } })?.response?.data?.message
    throw new Error(msg || (error as Error)?.message || 'Ошибка при создании мероприятия')
  }
}

