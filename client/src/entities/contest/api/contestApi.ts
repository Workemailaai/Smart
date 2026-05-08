import { axiosInstance, type ServerResponseType } from '@/shared'
import type {
  ICriterion,
  IContest,
  IContestResultsView,
  IContestTypeOption,
  IJuryContestView,
  IOrganizerContestView,
  IParticipantCommentItem,
  IScoreItem,
} from '../model/contest.types'

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

export const getJuryContestView = async (
  contestId: number,
): Promise<ServerResponseType<IJuryContestView>> => {
  const response = await axiosInstance.get(`/contests/${contestId}/jury-view`)
  return response.data
}

/** Сохранить порядок показателей (жюри), если у мероприятия включены предпочтения жюри */
export const putJuryCriteriaOrder = async (
  contestId: number,
  orderedCriterionIds: number[],
): Promise<ServerResponseType<{ criteria: ICriterion[]; myCriterionOrder: number[] }>> => {
  const response = await axiosInstance.put(`/contests/${contestId}/criteria-order`, {
    orderedCriterionIds,
  })
  return response.data
}

export const getOrganizerContestView = async (
  contestId: number,
): Promise<ServerResponseType<IOrganizerContestView>> => {
  const response = await axiosInstance.get(`/contests/${contestId}/organizer-view`)
  return response.data
}

export const putScoresBatch = async (
  contestId: number,
  scores: IScoreItem[],
  comments: IParticipantCommentItem[],
): Promise<ServerResponseType<IScoreItem[]>> => {
  const response = await axiosInstance.put('/scores/batch', { contestId, scores, comments })
  return response.data
}

export const submitJuryContest = async (contestId: number): Promise<ServerResponseType<null>> => {
  const response = await axiosInstance.post(`/contests/${contestId}/jury-submit`)
  return response.data
}

export const revokeJurySubmission = async (
  contestId: number,
): Promise<ServerResponseType<{ submittedJuryCount: number; totalJuryCount: number; status: string }>> => {
  const response = await axiosInstance.post(`/contests/${contestId}/jury-revote`)
  return response.data
}

export const completeContest = async (contestId: number): Promise<ServerResponseType<IContest>> => {
  const response = await axiosInstance.post(`/contests/${contestId}/complete`)
  return response.data
}

export const deleteContest = async (contestId: number): Promise<ServerResponseType<null>> => {
  try {
    const response = await axiosInstance.delete(`/contests/${contestId}`)
    return response.data
  } catch (error) {
    const msg =
      (error as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error ||
      (error as { response?: { data?: { message?: string } } })?.response?.data?.message
    throw new Error(msg || (error as Error)?.message || 'Не удалось удалить мероприятие')
  }
}

export const getContestResultsView = async (
  contestId: number,
): Promise<ServerResponseType<IContestResultsView>> => {
  const response = await axiosInstance.get(`/contests/${contestId}/results-view`)
  return response.data
}

export const downloadContestExportReport = async (contestId: number): Promise<Blob> => {
  const response = await axiosInstance.get(`/contests/${contestId}/export-report`, {
    responseType: 'blob',
  })
  return response.data as Blob
}

