import { observer } from 'mobx-react-lite'
import { toastStore } from './toastStore'
import styles from './Toast.module.css'

/** Всплывающее уведомление справа снизу */
export const Toast = observer(function Toast() {
  if (!toastStore.message) return null

  const variantClass = toastStore.variant === 'error' ? styles.error : styles.success

  return (
    <div className={`${styles.toast} ${variantClass}`} role="status" aria-live="polite">
      {toastStore.message}
    </div>
  )
})
