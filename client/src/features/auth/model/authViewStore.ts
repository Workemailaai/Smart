import { makeAutoObservable } from 'mobx'
import type { AuthView } from './authPanel.types'

class AuthViewStore {
  activeView: AuthView = 'signUpOrg'

  constructor() {
    makeAutoObservable(this)
  }

  setActiveView = (view: AuthView) => {
    this.activeView = view
  }
}

export const authViewStore = new AuthViewStore()
