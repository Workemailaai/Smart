import styles from './MainPage.module.css'
import { observer } from 'mobx-react-lite'
import { userStore } from '@/entities/user'
import { useNavigate } from 'react-router'
import { useEffect } from 'react'

export const MainPage = observer(() => {
  const navigate = useNavigate()
  const user = userStore.user

  useEffect(() => {
    if (user) {
      navigate('/cabinet')
    }
  }, [navigate, user])

  return (
    <section className={styles.page}>
      <div className={styles.overlay} />
      <div className={styles.content}>
        <h1 className={styles.logo}>СмартОценка</h1>

        <div className={styles.cards}>
          <button className={styles.card} onClick={() => navigate('/auth/organizer/sign-up')} type="button">
            <div className={styles.avatar}>О</div>
            <p className={styles.cardTitle}>Я организатор</p>
          </button>

          <button className={styles.card} onClick={() => navigate('/auth/jury/sign-in')} type="button">
            <div className={styles.avatar}>Ж</div>
            <p className={styles.cardTitle}>Я жюри</p>
          </button>
        </div>

        <p className={styles.footerText}>
          v 1.0.
          <br />© 2026 СмартОценка
        </p>
      </div>
    </section>
  )
})