import { observer } from 'mobx-react-lite'
import { Navigate, useNavigate, useParams } from 'react-router'
import { userStore } from '@/entities/user'
import { CreateEventForm, createEventFormStore } from '@/features/event-constructor'
import { Toast } from '@/shared'
import { OrganizerCabinetSidebar } from '@/widgets/organizer-cabinet-sidebar/OrganizerCabinetSidebar'
import styles from './CreateEventPage.module.css'

export const CreateEventPage = observer(function CreateEventPage() {
  const navigate = useNavigate()
  const { templateId: templateIdParam } = useParams()
  const user = userStore.user
  const isEditMode = Boolean(templateIdParam)
  const editingName = createEventFormStore.editingTemplateName.trim()
  const pageTitle = isEditMode
    ? `Редактирование: ${editingName || '…'}`
    : 'Конструктор'

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
        <CreateEventForm />
      </div>
      <Toast />
    </section>
  )
})
