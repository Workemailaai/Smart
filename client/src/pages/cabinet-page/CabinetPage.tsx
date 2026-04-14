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
  const archivedContests = isOrganizer ? contestStore.organizerArchivedContests : []
  const templates = templateStore.templates

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
              <div className={styles.avatar}>{getInitials(fullName)}</div>
            </div>
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

        <div className={styles.sidebarFooter}>
          <button className={styles.logoutButton} onClick={() => void onLogout()} type="button">
            Выход
          </button>
          <p className={styles.versionText}>v 1.0.0{'\n'}© 2026 СмартОценка</p>
        </div>
      </aside>

      <div className={styles.content}>
        <header className={styles.topBar}>
          <h2 className={styles.title}>{pageTitle}</h2>
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

        {section === 'constructor' ? (
          <div className={styles.constructorBlock}>
            <div className={styles.constructorHero}>
              <button className={styles.heroCreateButton} type="button" onClick={() => navigate('/cabinet/constructor/new')}>
                <span className={styles.heroCreateInner}>
                  <span className={styles.heroCreatePlusH} />
                  <span className={styles.heroCreatePlusV} />
                </span>
              </button>
              <h3 className={styles.constructorTitle}>Создать мероприятие</h3>
            </div>
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
                <div className={styles.sectionTitleWrap}>
                  <span className={`${styles.sectionDot} ${styles.sectionDotBlue}`}>
                    <span />
                  </span>
                  <h3 className={styles.sectionTitle}>{isOrganizer ? 'Идет процесс оценивания' : 'Ждут оценки'}</h3>
                  <span className={`${styles.sectionCount} ${styles.sectionCountBlue}`}>({pendingContests.length})</span>
                </div>
                <button className={styles.filterButton} type="button">
                  <span>Все</span>
                  <span aria-hidden className={styles.filterChevron}>
                    ˅
                  </span>
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
                  withAlertStripe={isOrganizer}
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
                <div className={styles.sectionTitleWrap}>
                  <span className={`${styles.sectionDot} ${styles.sectionDotGreen}`}>
                    <span />
                  </span>
                  <h3 className={styles.sectionTitle}>{isOrganizer ? 'Завершенные' : 'Оцененные'}</h3>
                  <span className={`${styles.sectionCount} ${styles.sectionCountGreen}`}>({ratedContests.length})</span>
                </div>
                <button className={styles.filterButton} type="button">
                  <span>Все</span>
                  <span aria-hidden className={styles.filterChevron}>
                    ˅
                  </span>
                </button>
              </div>
              {!contestStore.isLoading && !contestStore.error && ratedContests.length === 0 ? (
                <p className={styles.helperText}>Архив пуст</p>
              ) : null}
              {ratedContests.map((contest) => (
                <ContestCard
                  contest={contest}
                  key={contest.id}
                  variant={isOrganizer ? 'results' : 'pending'}
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

            {isOrganizer ? (
              <section className={styles.eventsCard}>
                <div className={styles.sectionHeader}>
                  <div className={styles.sectionTitleWrap}>
                    <span className={`${styles.sectionDot} ${styles.sectionDotOrange}`}>
                      <span />
                    </span>
                    <h3 className={styles.sectionTitle}>Архив</h3>
                    <span className={`${styles.sectionCount} ${styles.sectionCountOrange}`}>({archivedContests.length})</span>
                  </div>
                  <button className={styles.filterButton} type="button">
                    <span>Все</span>
                    <span aria-hidden className={styles.filterChevron}>
                      ˅
                    </span>
                  </button>
                </div>
                {!contestStore.isLoading && !contestStore.error && archivedContests.length === 0 ? (
                  <p className={styles.helperText}>Архив пуст</p>
                ) : null}
                {archivedContests.map((contest) => (
                  <ContestCard
                    contest={contest}
                    key={contest.id}
                    variant="results"
                    onOpen={() => navigate(`/cabinet/events/${contest.id}/organizer`)}
                  />
                ))}
              </section>
            ) : null}
          </div>
        )}
      </div>
    </section>
  )
})
