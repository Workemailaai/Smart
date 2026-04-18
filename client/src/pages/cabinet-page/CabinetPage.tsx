import { observer } from 'mobx-react-lite'
import { useEffect, useState } from 'react'
import { NavLink, Navigate, useNavigate } from 'react-router'
import { ContestCard, contestStore, getContestTypes, type IContest } from '@/entities/contest'
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
  const [contestTypeOptions, setContestTypeOptions] = useState<{ id: string; label: string }[]>([])
  const [isPendingFilterOpen, setIsPendingFilterOpen] = useState(false)
  const [isRatedFilterOpen, setIsRatedFilterOpen] = useState(false)
  const [isArchivedFilterOpen, setIsArchivedFilterOpen] = useState(false)
  const [pendingFilterType, setPendingFilterType] = useState('all')
  const [ratedFilterType, setRatedFilterType] = useState('all')
  const [archivedFilterType, setArchivedFilterType] = useState('all')

  useEffect(() => {
    void contestStore.fetchContests()
  }, [])

  useEffect(() => {
    if (isOrganizer) {
      void templateStore.fetchTemplates()
    }
  }, [isOrganizer])

  useEffect(() => {
    const loadContestTypes = async () => {
      try {
        const response = await getContestTypes()
        setContestTypeOptions(response.data ?? [])
      } catch {
        setContestTypeOptions([])
      }
    }
    void loadContestTypes()
  }, [])

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
  const archivedContests = isOrganizer ? contestStore.organizerArchivedContests : contestStore.juryArchivedContests
  const templates = templateStore.templates
  const titleByType = new Map<string, string>()
  contestTypeOptions.forEach((option) => {
    titleByType.set(option.id, option.label)
  })
  contestStore.contests.forEach((contest) => {
    if (contest.contestType && !titleByType.has(contest.contestType)) {
      titleByType.set(contest.contestType, contest.contestType)
    }
  })
  const availableContestTypeOptions = [{ id: 'all', label: 'Все' }, ...Array.from(titleByType, ([id, label]) => ({ id, label }))]

  const getSelectedFilterTitle = (selectedType: string) => {
    return availableContestTypeOptions.find((option) => option.id === selectedType)?.label || 'Все'
  }

  const filterContestsByType = (contests: IContest[], selectedType: string) => {
    if (selectedType === 'all') {
      return contests
    }
    return contests.filter((contest) => contest.contestType === selectedType)
  }

  const filteredPendingContests = filterContestsByType(pendingContests, pendingFilterType)
  const filteredRatedContests = filterContestsByType(ratedContests, ratedFilterType)
  const filteredArchivedContests = filterContestsByType(archivedContests, archivedFilterType)

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
              <span aria-hidden className={`${styles.navIcon} ${styles.navIconEvents}`} />
              <span className={styles.menuLabel}>Мероприятия</span>
            </NavLink>
            {isOrganizer ? (
              <NavLink
                className={({ isActive }) => (isActive ? styles.activeItem : styles.menuItem)}
                to="/cabinet/constructor"
              >
                <span aria-hidden className={`${styles.navIcon} ${styles.navIconConstructor}`} />
                <span className={styles.menuLabel}>Конструктор</span>
              </NavLink>
            ) : null}
            <NavLink className={({ isActive }) => (isActive ? styles.activeItem : styles.menuItem)} to="/cabinet/settings">
              <span aria-hidden className={`${styles.navIcon} ${styles.navIconSettings}`} />
              <span className={styles.menuLabel}>Настройки</span>
            </NavLink>
            <NavLink className={({ isActive }) => (isActive ? styles.activeItem : styles.menuItem)} to="/cabinet/info">
              <span aria-hidden className={`${styles.navIcon} ${styles.navIconInfo}`} />
              <span className={styles.menuLabel}>Информация</span>
            </NavLink>
          </nav>
        </div>

        <div className={styles.sidebarFooter}>
          <button className={styles.logoutButton} onClick={() => void onLogout()} type="button">
            <span aria-hidden className={styles.logoutIcon} />
            <span>Выход</span>
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
                  <span className={`${styles.sectionCount} ${styles.sectionCountBlue}`}>({filteredPendingContests.length})</span>
                </div>
                <div className={styles.filterBox}>
                  <button
                    className={styles.filterButton}
                    type="button"
                    onClick={() => {
                      setIsPendingFilterOpen((prev) => !prev)
                      setIsRatedFilterOpen(false)
                      setIsArchivedFilterOpen(false)
                    }}
                  >
                    <span>{getSelectedFilterTitle(pendingFilterType)}</span>
                    <span aria-hidden className={styles.filterChevron} />
                  </button>
                  {isPendingFilterOpen ? (
                    <div className={styles.filterDropdown}>
                      {availableContestTypeOptions.map((option) => (
                        <button
                          key={`pending-${option.id}`}
                          className={`${styles.filterOption} ${pendingFilterType === option.id ? styles.filterOptionActive : ''}`}
                          type="button"
                          onClick={() => {
                            setPendingFilterType(option.id)
                            setIsPendingFilterOpen(false)
                          }}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
              <div className={styles.eventsBody}>
                <div className={styles.tableHeader}>
                  <span className={styles.tableHeaderCover}>Обложка</span>
                  <span>Название конкурса</span>
                  <span>Дата</span>
                  <span>Тип конкурса</span>
                  <span className={styles.tableHeaderAction}>Действие</span>
                </div>
                {contestStore.isLoading ? <p className={`${styles.helperText} ${styles.eventsHelperText}`}>Загрузка мероприятий...</p> : null}
                {contestStore.error ? <p className={styles.errorText}>{contestStore.error}</p> : null}
                {!contestStore.isLoading && !contestStore.error && filteredPendingContests.length === 0 ? (
                  <p className={`${styles.helperText} ${styles.eventsHelperText}`}>Пока нет мероприятий</p>
                ) : null}
                {filteredPendingContests.map((contest) => (
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
              </div>
            </section>

            <section className={styles.eventsCard}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionTitleWrap}>
                  <span className={`${styles.sectionDot} ${styles.sectionDotGreen}`}>
                    <span />
                  </span>
                  <h3 className={styles.sectionTitle}>{isOrganizer ? 'Завершенные' : 'Оцененные'}</h3>
                  <span className={`${styles.sectionCount} ${styles.sectionCountGreen}`}>({filteredRatedContests.length})</span>
                </div>
                <div className={styles.filterBox}>
                  <button
                    className={styles.filterButton}
                    type="button"
                    onClick={() => {
                      setIsRatedFilterOpen((prev) => !prev)
                      setIsPendingFilterOpen(false)
                      setIsArchivedFilterOpen(false)
                    }}
                  >
                    <span>{getSelectedFilterTitle(ratedFilterType)}</span>
                    <span aria-hidden className={styles.filterChevron} />
                  </button>
                  {isRatedFilterOpen ? (
                    <div className={styles.filterDropdown}>
                      {availableContestTypeOptions.map((option) => (
                        <button
                          key={`rated-${option.id}`}
                          className={`${styles.filterOption} ${ratedFilterType === option.id ? styles.filterOptionActive : ''}`}
                          type="button"
                          onClick={() => {
                            setRatedFilterType(option.id)
                            setIsRatedFilterOpen(false)
                          }}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
              <div className={styles.eventsBody}>
                <div className={styles.tableHeader}>
                  <span className={styles.tableHeaderCover}>Обложка</span>
                  <span>Название конкурса</span>
                  <span>Дата</span>
                  <span>Тип конкурса</span>
                  <span className={styles.tableHeaderAction}>Действие</span>
                </div>
                {!contestStore.isLoading && !contestStore.error && filteredRatedContests.length === 0 ? (
                  <p className={`${styles.helperText} ${styles.eventsHelperText}`}>Пока нет оцененных мероприятий</p>
                ) : null}
                {filteredRatedContests.map((contest) => (
                  <ContestCard
                    contest={contest}
                    key={contest.id}
                    variant={isOrganizer || contest.status === 'archived' ? 'results' : 'pending'}
                    onOpen={() =>
                      navigate(
                        isOrganizer || contest.status === 'archived'
                          ? `/cabinet/events/${contest.id}/results`
                          : `/cabinet/events/${contest.id}/jury`,
                      )
                    }
                  />
                ))}
              </div>
            </section>

            <section className={styles.eventsCard}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionTitleWrap}>
                  <span className={`${styles.sectionDot} ${styles.sectionDotOrange}`}>
                    <span />
                  </span>
                  <h3 className={styles.sectionTitle}>Архив</h3>
                  <span className={`${styles.sectionCount} ${styles.sectionCountOrange}`}>({filteredArchivedContests.length})</span>
                </div>
                <div className={styles.filterBox}>
                  <button
                    className={styles.filterButton}
                    type="button"
                    onClick={() => {
                      setIsArchivedFilterOpen((prev) => !prev)
                      setIsPendingFilterOpen(false)
                      setIsRatedFilterOpen(false)
                    }}
                  >
                    <span>{getSelectedFilterTitle(archivedFilterType)}</span>
                    <span aria-hidden className={styles.filterChevron} />
                  </button>
                  {isArchivedFilterOpen ? (
                    <div className={styles.filterDropdown}>
                      {availableContestTypeOptions.map((option) => (
                        <button
                          key={`archived-${option.id}`}
                          className={`${styles.filterOption} ${archivedFilterType === option.id ? styles.filterOptionActive : ''}`}
                          type="button"
                          onClick={() => {
                            setArchivedFilterType(option.id)
                            setIsArchivedFilterOpen(false)
                          }}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
              <div className={styles.eventsBody}>
                <div className={styles.tableHeader}>
                  <span className={styles.tableHeaderCover}>Обложка</span>
                  <span>Название конкурса</span>
                  <span>Дата</span>
                  <span>Тип конкурса</span>
                  <span className={styles.tableHeaderAction}>Действие</span>
                </div>
                {!contestStore.isLoading && !contestStore.error && filteredArchivedContests.length === 0 ? (
                  <p className={`${styles.helperText} ${styles.eventsHelperText}`}>Архив пуст</p>
                ) : null}
                {filteredArchivedContests.map((contest) => (
                  <ContestCard
                    contest={contest}
                    key={contest.id}
                    variant="results"
                    onOpen={() => navigate(`/cabinet/events/${contest.id}/results`)}
                  />
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </section>
  )
})
