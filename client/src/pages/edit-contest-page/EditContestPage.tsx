import { observer } from 'mobx-react-lite'
import { Navigate, useNavigate, useParams } from 'react-router'
import { contestRosterEditStore } from '@/features/contest-roster-edit'
import { CreateEventForm } from '@/features/event-constructor/ui/CreateEventForm'
import { userStore } from '@/entities/user'
import { Toast } from '@/shared'
import { OrganizerCabinetSidebar } from '@/widgets/organizer-cabinet-sidebar/OrganizerCabinetSidebar'
import styles from '../create-event-page/CreateEventPage.module.css'

export const EditContestPage = observer(function EditContestPage() {
  const navigate = useNavigate()
  const { contestId: contestIdParam } = useParams()
  const user = userStore.user
  const editingTitle = contestRosterEditStore.contestTitle.trim()
  const pageTitle = editingTitle ? `Редактирование: ${editingTitle}` : 'Редактирование мероприятия'

  if (!userStore.isAuthCheckCompleted) {
    return (
      <section className={styles.page}>
        <div className={styles.content}>
          <h2 className={styles.title}>Проверка сессии...</h2>
        </div>
      </section>
    )
  }

  if (!user) {
    return <Navigate replace to="/" />
  }

  if (user.role !== 'organizer') {
    return <Navigate replace to="/cabinet/events" />
  }

  if (!contestIdParam) {
    return <Navigate replace to="/cabinet/events" />
  }

  const fullName = user.fullName || 'Пользователь'

  const onLogout = async () => {
    await userStore.logout()
    navigate('/')
  }

  return (
    <section className={styles.page}>
      <OrganizerCabinetSidebar fullName={fullName} phone={user.phone} onLogout={onLogout} />
      <div className={styles.content}>
        <header className={styles.topBar}>
          <h2 className={styles.title}>{pageTitle}</h2>
          <div className={styles.searchWrap}>
            <label className={styles.searchLabel}>
              <img alt="" aria-hidden className={styles.searchIcon} src="/nav/header-search-normal.svg" />
              <input className={styles.search} placeholder="Поиск" type="text" />
            </label>
          </div>
          <button className={styles.lang} type="button">
            <span className={styles.langPrimary}>RU</span>
            <span className={styles.langDivider}>/</span>
            <span className={styles.langSecondary}>ENG</span>
          </button>
        </header>
        <CreateEventForm mode="rosterEdit" />
      </div>
      <Toast />
    </section>
  )
})
