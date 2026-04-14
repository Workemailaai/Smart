import { observer } from 'mobx-react-lite'
import { useEffect } from 'react'
import { NavLink, Navigate, useNavigate } from 'react-router'
import { ContestCard, contestStore } from '@/entities/contest'
import { TemplateCard, templateStore } from '@/entities/template'
import { userStore } from '@/entities/user'
import styles from './CabinetPage.module.css'

type CabinetSection = 'events' | 'constructor' | 'settings' | 'info'

type CabinetPageProps = {
  section: CabinetSection
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export const CabinetPage = observer(({ section }: CabinetPageProps) => {
  const navigate = useNavigate()
  const user = userStore.user
  const isOrganizer = user?.role === 'organizer'

  useEffect(() => {
    void contestStore.fetchContests()
  }, [])

  useEffect(() => {
    if (isOrganizer) {
      void templateStore.fetchTemplates()
    }
  }, [isOrganizer])

  if (!user) {
    return <Navigate replace to="/" />
  }

  if (section === 'constructor' && user.role === 'jury') {
    return <Navigate replace to="/cabinet/events" />
  }

  const fullName = user.fullName || 'Пользователь'
  const roleTitle = isOrganizer ? 'Организатор' : 'Жюри'
  const pageTitle = section === 'constructor' ? 'Конструктор' : 'Мероприятия'
  const pendingContests = isOrganizer
    ? contestStore.organizerInProgressContests
    : contestStore.juryPendingContests
  const ratedContests = isOrganizer
    ? contestStore.organizerCompletedContests
    : contestStore.juryRatedContests
  const templates = templateStore.templates

  const onLogout = async () => {
    await userStore.logout()
    navigate('/')
  }

  return (
    <section className={styles.page}>
      <aside className={styles.sidebar}>
        <div>
          <h1 className={styles.brand}>СмартОценка</h1>
          <div className={styles.profileCard}>
            <div className={styles.avatar}>{getInitials(fullName)}</div>
            <p className={styles.name}>{fullName}</p>
            <p className={styles.phone}>{user.phone}</p>
            <span className={styles.roleBadge}>{roleTitle}</span>
          </div>

          <nav className={styles.menu}>
            <NavLink className={({ isActive }) => (isActive ? styles.activeItem : styles.menuItem)} to="/cabinet/events">
              Мероприятия
            </NavLink>
            {isOrganizer ? (
              <NavLink
                className={({ isActive }) => (isActive ? styles.activeItem : styles.menuItem)}
                to="/cabinet/constructor"
              >
                Конструктор
              </NavLink>
            ) : null}
            <NavLink className={({ isActive }) => (isActive ? styles.activeItem : styles.menuItem)} to="/cabinet/settings">
              Настройки
            </NavLink>
            <NavLink className={({ isActive }) => (isActive ? styles.activeItem : styles.menuItem)} to="/cabinet/info">
              Информация
            </NavLink>
          </nav>
        </div>

        <button className={styles.logoutButton} onClick={() => void onLogout()} type="button">
          Выход
        </button>
      </aside>

      <div className={styles.content}>
        <header className={styles.topBar}>
          <h2 className={styles.title}>{pageTitle}</h2>
          <div className={styles.searchWrap}>
            <input className={styles.search} placeholder="Поиск" type="text" />
          </div>
          <button className={styles.lang} type="button">
            RU / ENG
          </button>
        </header>

        {section === 'constructor' ? (
          <div className={styles.constructorBlock}>
            <button
              className={styles.createRoundButton}
              type="button"
              onClick={() => navigate('/cabinet/constructor/new')}
            >
              +
            </button>
            <h3 className={styles.constructorTitle}>Создать мероприятие</h3>
            <p className={styles.templatesTitle}>Шаблоны</p>
            <div className={styles.templateGrid}>
              <button className={styles.newTemplate} type="button">
                +
              </button>
              {templateStore.isLoading ? <p className={styles.helperText}>Загрузка шаблонов...</p> : null}
              {templateStore.error ? <p className={styles.errorText}>{templateStore.error}</p> : null}
              {!templateStore.isLoading && !templateStore.error
                ? templates.slice(0, 3).map((template) => (
                    <button
                      key={template.id}
                      className={styles.templateCardBtn}
                      type="button"
                      onClick={() => navigate(`/cabinet/constructor/new?templateId=${template.id}`)}
                    >
                      <TemplateCard template={template} />
                    </button>
                  ))
                : null}
            </div>
          </div>
        ) : (
          <div className={styles.eventsLayout}>
            <section className={styles.eventsCard}>
              <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>
                  {isOrganizer ? 'В процессе оценивания' : 'Ждут оценки'} ({pendingContests.length})
                </h3>
                <button className={styles.filterButton} type="button">
                  Все
                </button>
              </div>
              {contestStore.isLoading ? <p className={styles.helperText}>Загрузка мероприятий...</p> : null}
              {contestStore.error ? <p className={styles.errorText}>{contestStore.error}</p> : null}
              {!contestStore.isLoading && !contestStore.error && pendingContests.length === 0 ? (
                <p className={styles.helperText}>Пока нет мероприятий</p>
              ) : null}
              {pendingContests.map((contest) => (
                <ContestCard
                  contest={contest}
                  key={contest.id}
                  onOpen={() =>
                    navigate(
                      isOrganizer
                        ? `/cabinet/events/${contest.id}/organizer`
                        : `/cabinet/events/${contest.id}/jury`,
                    )
                  }
                />
              ))}
            </section>

            <section className={styles.eventsCard}>
              <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>
                  {isOrganizer ? 'Завершённые' : 'Оцененные'} ({ratedContests.length})
                </h3>
                <button className={styles.filterButton} type="button">
                  Все
                </button>
              </div>
              {!contestStore.isLoading && !contestStore.error && ratedContests.length === 0 ? (
                <p className={styles.helperText}>Архив пуст</p>
              ) : null}
              {ratedContests.map((contest) => (
                <ContestCard
                  actionLabel={isOrganizer ? 'Открыть' : 'Открыть'}
                  contest={contest}
                  key={contest.id}
                  onOpen={() =>
                    navigate(
                      isOrganizer
                        ? `/cabinet/events/${contest.id}/organizer`
                        : `/cabinet/events/${contest.id}/jury`,
                    )
                  }
                />
              ))}
            </section>
          </div>
        )}
      </div>
    </section>
  )
})
