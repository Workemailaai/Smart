import { observer } from 'mobx-react-lite'
import { Link, Navigate } from 'react-router'
import { userStore } from '@/entities/user'
import { CreateEventForm } from '@/features/event-constructor'
import styles from './CreateEventPage.module.css'

export const CreateEventPage = observer(function CreateEventPage() {
  const user = userStore.user

  if (!user) {
    return <Navigate replace to="/" />
  }

  if (user.role !== 'organizer') {
    return <Navigate replace to="/cabinet/events" />
  }

  return (
    <section className={styles.page}>
      <aside className={styles.sidebar}>
        <div>
          <h1 className={styles.brand}>СмартОценка</h1>
          <Link className={styles.backLink} to="/cabinet/constructor">
            ← Назад в конструктор
          </Link>
        </div>
      </aside>
      <div className={styles.content}>
        <header className={styles.topBar}>
          <h2 className={styles.title}>Создание мероприятия</h2>
        </header>
        <CreateEventForm />
      </div>
    </section>
  )
})
