import { makeAutoObservable, runInAction } from 'mobx'

export type ToastVariant = 'success' | 'error'

const TOAST_HIDE_MS = 4000

class ToastStore {
  message: string | null = null
  variant: ToastVariant = 'success'
  private hideTimer: ReturnType<typeof setTimeout> | null = null

  constructor() {
    makeAutoObservable(this)
  }

  show(message: string, variant: ToastVariant = 'success') {
    if (this.hideTimer) {
      clearTimeout(this.hideTimer)
      this.hideTimer = null
    }
    this.message = message
    this.variant = variant
    this.hideTimer = setTimeout(() => {
      runInAction(() => {
        this.message = null
        this.hideTimer = null
      })
    }, TOAST_HIDE_MS)
  }

  hide() {
    if (this.hideTimer) {
      clearTimeout(this.hideTimer)
      this.hideTimer = null
    }
    this.message = null
  }
}

export const toastStore = new ToastStore()
