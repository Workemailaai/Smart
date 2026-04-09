import { axiosInstance, type ServerResponseType } from '@/shared'
import type { IContest } from '../model/contest.types'

export const getContests = async (): Promise<ServerResponseType<IContest[]>> => {
  try {
    const response = await axiosInstance.get('/contests')
    return response.data
  } catch (error) {
    throw new Error((error as Error)?.message || 'Ошибка при получении мероприятий')
  }
}
