import { makeAutoObservable, runInAction } from 'mobx'
import { signIn, signUp, userStore } from '@/entities/user'
import { setAccessToken } from '@/shared/api/axiosInstance'
import type { SignInJuryForm, SignInOrgForm, SignInPayload, SignUpForm, SignUpPayload } from './authPanel.types'

class AuthFormStore {
  isLoading = false
  error: string | null = null
  successMessage: string | null = null
  signUpForm: SignUpForm = {
    fullName: '',
    phone: '',
    password: '',
    repeatPassword: '',
  }
  signInOrgForm: SignInOrgForm = {
    phone: '',
    password: '',
  }
  signInJuryForm: SignInJuryForm = {
    phone: '',
    password: '',
  }

  constructor() {
    makeAutoObservable(this)
  }

  resetStatus = () => {
    this.error = null
    this.successMessage = null
  }

  setError = (message: string) => {
    this.error = message
    this.successMessage = null
  }

  setSignUpField = <K extends keyof SignUpForm>(field: K, value: SignUpForm[K]) => {
    this.signUpForm[field] = value
  }

  setSignInOrgField = <K extends keyof SignInOrgForm>(field: K, value: SignInOrgForm[K]) => {
    this.signInOrgForm[field] = value
  }

  setSignInJuryField = <K extends keyof SignInJuryForm>(field: K, value: SignInJuryForm[K]) => {
    this.signInJuryForm[field] = value
  }

  resetForms = () => {
    this.signUpForm = {
      fullName: '',
      phone: '',
      password: '',
      repeatPassword: '',
    }
    this.signInOrgForm = {
      phone: '',
      password: '',
    }
    this.signInJuryForm = {
      phone: '',
      password: '',
    }
  }

  signUpOrganizer = async (payload: SignUpPayload) => {
    this.resetStatus()
    this.isLoading = true

    try {
      const response = await signUp(payload)
      runInAction(() => {
        setAccessToken(response.data.accessToken)
        userStore.user = response.data.user
        this.successMessage = response.message || 'Регистрация выполнена успешно'
      })
    } catch (error) {
      runInAction(() => {
        this.error = (error as Error)?.message || 'Ошибка при регистрации'
      })
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  signInOrganizer = async (payload: SignInPayload) => {
    this.resetStatus()
    this.isLoading = true

    try {
      const response = await signIn(payload)
      runInAction(() => {
        setAccessToken(response.data.accessToken)
        userStore.user = response.data.user
        this.successMessage = response.message || 'Вход выполнен успешно'
      })
    } catch (error) {
      runInAction(() => {
        this.error = (error as Error)?.message || 'Ошибка при входе'
      })
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  signInJury = async (payload: SignInPayload) => {
    this.resetStatus()
    this.isLoading = true

    try {
      const response = await signIn(payload)
      runInAction(() => {
        setAccessToken(response.data.accessToken)
        userStore.user = response.data.user
        this.successMessage = response.message || 'Вход выполнен успешно'
      })
    } catch (error) {
      runInAction(() => {
        this.error = (error as Error)?.message || 'Ошибка при входе'
      })
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }
}

export const authFormStore = new AuthFormStore()
