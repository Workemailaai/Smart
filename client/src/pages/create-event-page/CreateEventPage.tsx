import { observer } from 'mobx-react-lite'
import { NavLink, Navigate, useNavigate } from 'react-router'
import { userStore } from '@/entities/user'
import { CreateEventForm } from '@/features/event-constructor'
import styles from './CreateEventPage.module.css'

export const CreateEventPage = observer(function CreateEventPage() {
  const navigate = useNavigate()
  const user = userStore.user

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
      <aside className={styles.sidebar}>
        <div>
          <div className={styles.sidebarHeader}>
            <h1 className={styles.brand}>СмартОценка</h1>
          </div>
          <div className={styles.profileCard}>
            <div className={styles.avatarWrap}>
              <div className={styles.avatar}>
                {fullName
                  .split(' ')
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((part) => part[0]?.toUpperCase() ?? '')
                  .join('')}
              </div>
            </div>
            <p className={styles.name}>{fullName}</p>
            <p className={styles.phone}>{user.phone}</p>
            <span className={styles.roleBadge}>Организатор</span>
          </div>

          <nav className={styles.menu}>
            <NavLink className={({ isActive }) => (isActive ? styles.activeItem : styles.menuItem)} to="/cabinet/events">
              Мероприятия
            </NavLink>
            <NavLink className={({ isActive }) => (isActive ? styles.activeItem : styles.menuItem)} to="/cabinet/constructor">
              Конструктор
            </NavLink>
            <NavLink className={({ isActive }) => (isActive ? styles.activeItem : styles.menuItem)} to="/cabinet/settings">
              Настройки
            </NavLink>
            <NavLink className={({ isActive }) => (isActive ? styles.activeItem : styles.menuItem)} to="/cabinet/info">
              Информация
            </NavLink>
          </nav>
        </div>

        <div className={styles.sidebarFooter}>
          <button className={styles.logoutButton} onClick={() => void onLogout()} type="button">
            Выход
          </button>
          <p className={styles.versionText}>v 1.0.0{'\n'}© 2026 СмартОценка</p>
        </div>
      </aside>
      <div className={styles.content}>
        <header className={styles.topBar}>
          <h2 className={styles.title}>Конструктор</h2>
          <div className={styles.searchWrap}>
            <label className={styles.searchLabel}>
              <span aria-hidden className={styles.searchIcon}>
                ⌕
              </span>
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
    </section>
  )
})
