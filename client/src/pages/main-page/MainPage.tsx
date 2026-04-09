import { AuthPanel } from '@/features/auth'
import styles from './MainPage.module.css'

export function MainPage() {
  return (
    <section className={styles.page}>
      <div className={styles.overlay} />
      <div className={styles.content}>
        <AuthPanel />
      </div>
    </section>
  )
}