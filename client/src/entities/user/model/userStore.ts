import { makeAutoObservable, runInAction } from 'mobx'
import { signUp, signIn, logout, refreshTokens } from '../api/userApi'
import type { IUser, ISignUpData, ISignInData } from '../model/user.types'

export class UserStore {
    user: IUser | null = null
    isLoading = false
    isAuthCheckCompleted = false
    error: string | null = null

    constructor() {
        makeAutoObservable(this)
    }

    signUp = async (data: ISignUpData) => {
        try {
            this.isLoading = true
            const response = await signUp(data)
            runInAction(() => {
                this.user = response.data.user
            })
        } catch (error) {
            this.error = (error as Error).message
        }
    }

    signIn = async (data: ISignInData) => {
        try {
            this.isLoading = true
            const response = await signIn(data)
            runInAction(() => {
                this.user = response.data.user
            })
        } catch (error) {
            this.error = (error as Error).message
        }
    }

    logout = async () => {
        try {
            this.isLoading = true
            await logout()
            runInAction(() => {
                this.user = null
            })
        } catch (error) {
            this.error = (error as Error).message
        }
    }

    refreshTokens = async () => {
        try {
            this.isLoading = true
            const response = await refreshTokens()
            runInAction(() => {
                this.user = response.data.user
                this.error = null
            })
        } catch (error) {
            runInAction(() => {
                this.error = (error as Error).message
            })
        } finally {
            runInAction(() => {
                this.isLoading = false
                this.isAuthCheckCompleted = true
            })
        }
    }
}

export const userStore = new UserStore()