import { axiosInstance, type ServerResponseType } from '@/shared'
import type { IAuthResponseData, ISignInData, ISignUpData } from '../model/user.types'

export const signUp = async (data: ISignUpData): Promise<ServerResponseType<IAuthResponseData>> => {
    try {
        const response = await axiosInstance.post('/auth/sign-up', data)
        return response.data
    } catch (error) {
        throw new Error((error as Error)?.message || 'ошибка при регистрации')
    }
}

export const signIn = async (data: ISignInData): Promise<ServerResponseType<IAuthResponseData>> => {
    try {
        const response = await axiosInstance.post('/auth/sign-in', data)
        return response.data
    } catch (error) {
        throw new Error((error as Error)?.message || 'ошибка при входе')
    }
}

export const logout = async (): Promise<ServerResponseType<void>> => {
    try {
        const response = await axiosInstance.post('/auth/logout')
        return response.data
    } catch (error) {
        throw new Error((error as Error)?.message || 'ошибка при выходе из системы')
    }
}

export const refreshTokens = async (): Promise<ServerResponseType<IAuthResponseData>> => {
    try {
        const response = await axiosInstance.post('/auth/refresh-tokens')
        return response.data
    } catch (error) {
        throw new Error((error as Error)?.message || 'ошибка при обновлении токенов')
    }
}