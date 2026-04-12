import { AuthPanel } from '@/features/auth'
import styles from './MainPage.module.css'
import { observer } from 'mobx-react-lite'
import { userStore } from '@/entities/user'
import { useNavigate } from 'react-router'
import { useEffect } from 'react'

export const MainPage = observer(() => {
  const navigate = useNavigate()
  const user = userStore.user
  console.log('MainPage', user)
  useEffect(() => {
    if (user) {
      navigate('/cabinet')
    }
  }, [user])
  return (
    <section className={styles.page}>
      <div className={styles.overlay} />
      <div className={styles.content}>
        <AuthPanel />
      </div>
    </section>
  )
})