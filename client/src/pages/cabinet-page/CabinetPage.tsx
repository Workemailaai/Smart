import { observer } from 'mobx-react-lite'
import { useEffect, useState } from 'react'
import { NavLink, Navigate, useNavigate } from 'react-router'
import { ContestCard, contestStore, getContestTypes, type IContest } from '@/entities/contest'
import { TemplateCard, templateStore } from '@/entities/template'
import { userStore } from '@/entities/user'
import { formatRuPhoneMask } from '@/shared/lib/ruPhone'
import { OrganizerCabinetSidebar } from '@/widgets/organizer-cabinet-sidebar/OrganizerCabinetSidebar'
import { JuryCabinetSidebar } from '@/widgets/jury-cabinet-sidebar/JuryCabinetSidebar'
import styles from './CabinetPage.module.css'

type CabinetSection = 'events' | 'constructor' | 'settings' | 'info' | 'profile'

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
  const [isCompletedFilterOpen, setIsCompletedFilterOpen] = useState(false)
  const [pendingFilterType, setPendingFilterType] = useState('all')
  const [ratedFilterType, setRatedFilterType] = useState('all')
  const [completedFilterType, setCompletedFilterType] = useState('all')

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

  if (section === 'settings' || section === 'info') {
    return <Navigate replace to="/cabinet/events" />
  }

  if (section === 'profile' && user.role === 'organizer') {
    return <Navigate replace to="/cabinet/events" />
  }

  const fullName = user.fullName || 'Пользователь'
  const roleTitle = isOrganizer ? 'Организатор' : 'Жюри'
  const pageTitle =
    section === 'constructor'
      ? 'Конструктор'
      : section === 'settings'
        ? 'Настройки'
        : section === 'info'
          ? 'Информация'
          : section === 'profile'
            ? 'Профиль'
            : section === 'events' && !isOrganizer
              ? 'Мои мероприятия'
              : 'Мероприятия'
  const pendingContests = isOrganizer
    ? contestStore.organizerInProgressContests
    : contestStore.juryPendingContests
  const ratedContests = isOrganizer
    ? contestStore.organizerCompletedContests
    : contestStore.juryRatedContests
  const completedContests = isOrganizer ? [] : contestStore.juryCompletedContests
  const hasNoOrganizerContests =
    isOrganizer && pendingContests.length === 0 && ratedContests.length === 0
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
  const filteredCompletedContests = filterContestsByType(completedContests, completedFilterType)

  const onLogout = async () => {
    await userStore.logout()
    navigate('/')
  }

  return (
    <section
      className={`${styles.page} ${!isOrganizer ? styles.pageJuryCabinet : ''}`}
      data-cabinet-section={section}
    >
      {isOrganizer ? (
        <OrganizerCabinetSidebar fullName={fullName} phone={user.phone} onLogout={onLogout} />
      ) : (
        <JuryCabinetSidebar fullName={fullName} phone={user.phone} onLogout={onLogout} />
      )}

      {!isOrganizer ? (
        <nav className={styles.juryBottomNav} aria-label="Основные разделы кабинета жюри">
          <div className={styles.juryBottomNavInner}>
            <NavLink
              className={({ isActive }) =>
                `${styles.juryBottomNavLink} ${isActive ? styles.juryBottomNavLinkActive : ''}`
              }
              to="/cabinet/profile"
              aria-label="Профиль"
            >
              <span className={`${styles.juryBottomNavIcon} ${styles.juryBottomNavIconProfile}`} aria-hidden />
            </NavLink>
            <NavLink
              className={({ isActive }) =>
                `${styles.juryBottomNavLink} ${isActive ? styles.juryBottomNavLinkActive : ''}`
              }
              to="/cabinet/events"
              aria-label="Мероприятия"
            >
              <span className={`${styles.juryBottomNavIcon} ${styles.juryBottomNavIconEvents}`} aria-hidden />
            </NavLink>
            <span className={`${styles.juryBottomNavLink} ${styles.juryBottomNavLinkDisabled}`} aria-label="Настройки">
              <span className={`${styles.juryBottomNavIcon} ${styles.juryBottomNavIconSettings}`} aria-hidden />
            </span>
            <span className={`${styles.juryBottomNavLink} ${styles.juryBottomNavLinkDisabled}`} aria-label="Информация">
              <span className={`${styles.juryBottomNavIcon} ${styles.juryBottomNavIconInfo}`} aria-hidden />
            </span>
          </div>
        </nav>
      ) : null}

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

        {section === 'constructor' && isOrganizer ? (
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
            <div className={styles.constructorTemplates}>
              <p className={styles.templatesTitle}>Шаблоны</p>
              <div className={styles.templateGrid}>
              <button
                className={styles.newTemplate}
                type="button"
                onClick={() => navigate('/cabinet/constructor/new')}
                aria-label="Создать мероприятие без шаблона"
              >
                <span className={styles.newTemplateInner}>
                  <span className={styles.newTemplatePlusH} />
                  <span className={styles.newTemplatePlusV} />
                </span>
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
          </div>
        ) : section === 'profile' && !isOrganizer ? (
          <div className={styles.juryProfilePanel}>
            <div className={styles.juryProfileRow}>
              <button
                className={styles.juryProfileSideBtn}
                type="button"
                onClick={() => navigate('/cabinet/events')}
                aria-label="К списку мероприятий"
              >
                <span className={styles.juryProfileSideBtnIcon} aria-hidden>
                  <img src="/mobile/header-back.svg" alt="" width={18} height={18} />
                </span>
              </button>
              <div className={styles.juryProfileCenter}>
                <div className={styles.juryProfileAvatarRing}>
                  <div className={styles.juryProfileAvatar}>{getInitials(fullName)}</div>
                </div>
                <div className={styles.juryProfileTextBlock}>
                  <p className={styles.juryProfileName}>{fullName}</p>
                  <p className={styles.juryProfilePhone}>{formatRuPhoneMask(user.phone)}</p>
                </div>
                <span className={styles.juryProfileBadge}>{roleTitle}</span>
              </div>
              <button className={styles.juryProfileSideBtn} type="button" aria-label="Раздел в разработке" disabled>
                <span className={styles.juryProfileSideBtnIcon} aria-hidden>
                  <img src="/nav/setting.svg" alt="" width={18} height={18} />
                </span>
              </button>
            </div>
            <button className={styles.juryProfileLogout} onClick={() => void onLogout()} type="button">
              <span aria-hidden className={styles.juryProfileLogoutIcon} />
              <span>Выйти из аккаунта</span>
            </button>
          </div>
        ) : section === 'events' ? (
          <div className={styles.eventsLayout}>
            {hasNoOrganizerContests && !contestStore.isLoading && !contestStore.error ? (
              <div className={styles.eventsEmptyState}>
                <p className={styles.eventsEmptyTitle}>У вас еще нет ни одного мероприятия</p>
                <button
                  className={styles.eventsEmptyButton}
                  type="button"
                  onClick={() => navigate('/cabinet/constructor')}
                >
                  Перейти в конструктор
                </button>
              </div>
            ) : (
              <>
                <section className={isOrganizer ? styles.eventsSectionOrganizer : styles.eventsCard}>
              {isOrganizer ? (
                <div className={styles.eventsSectionBlock}>
                  <div className={styles.sectionHeader}>
                    <div className={styles.sectionTitleWrap}>
                      <span className={`${styles.sectionDot} ${styles.sectionDotBlue}`}>
                        <span />
                      </span>
                      <h3 className={styles.sectionTitle}>Идет процесс оценивания</h3>
                      <span className={`${styles.sectionCount} ${styles.sectionCountBlue}`}>({filteredPendingContests.length})</span>
                    </div>
                    <div className={styles.filterBox}>
                      <button
                        className={styles.filterButton}
                        type="button"
                        onClick={() => {
                          setIsPendingFilterOpen((prev) => !prev)
                          setIsRatedFilterOpen(false)
                          setIsCompletedFilterOpen(false)
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
                  {contestStore.isLoading ? <p className={`${styles.helperText} ${styles.eventsHelperText}`}>Загрузка мероприятий...</p> : null}
                  {contestStore.error ? <p className={styles.errorText}>{contestStore.error}</p> : null}
                  {!contestStore.isLoading && !contestStore.error && filteredPendingContests.length === 0 ? (
                    <p className={`${styles.helperText} ${styles.eventsHelperText}`}>Пока нет мероприятий</p>
                  ) : null}
                  {filteredPendingContests.map((contest) => (
                    <ContestCard
                      contest={contest}
                      key={contest.id}
                      organizerLayout
                      withAlertStripe
                      onDelete={() => contestStore.deleteContest(contest.id)}
                      onOpen={() => navigate(`/cabinet/events/${contest.id}/organizer`)}
                    />
                  ))}
                </div>
              ) : (
                <>
                  <div className={styles.sectionHeader}>
                    <div className={styles.sectionTitleWrap}>
                      <span className={`${styles.sectionDot} ${styles.sectionDotBlue}`}>
                        <span />
                      </span>
                      <h3 className={styles.sectionTitle}>Ждут оценки</h3>
                      <span className={`${styles.sectionCount} ${styles.sectionCountBlue}`}>({filteredPendingContests.length})</span>
                    </div>
                    <div className={styles.filterBox}>
                      <button
                        className={styles.filterButton}
                        type="button"
                        onClick={() => {
                          setIsPendingFilterOpen((prev) => !prev)
                          setIsRatedFilterOpen(false)
                          setIsCompletedFilterOpen(false)
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
                      <span className={styles.tableHeaderVotes}>Проголосовало</span>
                    </div>
                    {contestStore.isLoading ? <p className={`${styles.helperText} ${styles.eventsHelperText}`}>Загрузка мероприятий...</p> : null}
                    {contestStore.error ? <p className={styles.errorText}>{contestStore.error}</p> : null}
                    {!contestStore.isLoading && !contestStore.error && filteredPendingContests.length === 0 ? (
                      <p className={`${styles.helperText} ${styles.eventsHelperText}`}>Пока нет мероприятий</p>
                    ) : null}
                    {filteredPendingContests.map((contest) => (
                      <ContestCard
                        contest={contest}
                        juryCabinetCompact
                        showVotedColumn
                        key={contest.id}
                        onOpen={() => navigate(`/cabinet/events/${contest.id}/jury`)}
                      />
                    ))}
                  </div>
                </>
              )}
            </section>

                <section className={isOrganizer ? styles.eventsSectionOrganizer : styles.eventsCard}>
              {isOrganizer ? (
                <div className={styles.eventsSectionBlock}>
                  <div className={styles.sectionHeader}>
                    <div className={styles.sectionTitleWrap}>
                      <span className={`${styles.sectionDot} ${styles.sectionDotGreen}`}>
                        <span />
                      </span>
                      <h3 className={styles.sectionTitle}>Завершенные</h3>
                      <span className={`${styles.sectionCount} ${styles.sectionCountGreen}`}>({filteredRatedContests.length})</span>
                    </div>
                    <div className={styles.filterBox}>
                      <button
                        className={styles.filterButton}
                        type="button"
                        onClick={() => {
                          setIsRatedFilterOpen((prev) => !prev)
                          setIsPendingFilterOpen(false)
                          setIsCompletedFilterOpen(false)
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
                  {!contestStore.isLoading && !contestStore.error && filteredRatedContests.length === 0 ? (
                    <p className={`${styles.helperText} ${styles.eventsHelperText}`}>Пока нет оцененных мероприятий</p>
                  ) : null}
                  {filteredRatedContests.map((contest) => (
                    <ContestCard
                      contest={contest}
                      key={contest.id}
                      organizerLayout
                      variant="results"
                      withAlertStripe
                      onDelete={() => contestStore.deleteContest(contest.id)}
                      onOpen={() => navigate(`/cabinet/events/${contest.id}/results`)}
                    />
                  ))}
                </div>
              ) : (
                <>
                  <div className={styles.sectionHeader}>
                    <div className={styles.sectionTitleWrap}>
                      <span className={`${styles.sectionDot} ${styles.sectionDotOrange}`}>
                        <span />
                      </span>
                      <h3 className={styles.sectionTitle}>Ждут результата</h3>
                      <span className={`${styles.sectionCount} ${styles.sectionCountOrange}`}>({filteredRatedContests.length})</span>
                    </div>
                    <div className={styles.filterBox}>
                      <button
                        className={styles.filterButton}
                        type="button"
                        onClick={() => {
                          setIsRatedFilterOpen((prev) => !prev)
                          setIsPendingFilterOpen(false)
                          setIsCompletedFilterOpen(false)
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
                      <span className={styles.tableHeaderVotes}>Проголосовало</span>
                    </div>
                    {!contestStore.isLoading && !contestStore.error && filteredRatedContests.length === 0 ? (
                      <p className={`${styles.helperText} ${styles.eventsHelperText}`}>Пока нет оцененных мероприятий</p>
                    ) : null}
                    {filteredRatedContests.map((contest) => (
                      <ContestCard
                        contest={contest}
                        juryCabinetCompact
                        showVotedColumn
                        key={contest.id}
                        onOpen={() => navigate(`/cabinet/events/${contest.id}/jury`)}
                      />
                    ))}
                  </div>
                </>
              )}
            </section>

            {!isOrganizer ? (
              <section className={styles.eventsCard}>
                <div className={styles.sectionHeader}>
                  <div className={styles.sectionTitleWrap}>
                    <span className={`${styles.sectionDot} ${styles.sectionDotGreen}`}>
                      <span />
                    </span>
                    <h3 className={styles.sectionTitle}>Завершенные</h3>
                    <span className={`${styles.sectionCount} ${styles.sectionCountGreen}`}>
                      ({filteredCompletedContests.length})
                    </span>
                  </div>
                  <div className={styles.filterBox}>
                    <button
                      className={styles.filterButton}
                      type="button"
                      onClick={() => {
                        setIsCompletedFilterOpen((prev) => !prev)
                        setIsPendingFilterOpen(false)
                        setIsRatedFilterOpen(false)
                      }}
                    >
                      <span>{getSelectedFilterTitle(completedFilterType)}</span>
                      <span aria-hidden className={styles.filterChevron} />
                    </button>
                    {isCompletedFilterOpen ? (
                      <div className={styles.filterDropdown}>
                        {availableContestTypeOptions.map((option) => (
                          <button
                            key={`completed-${option.id}`}
                            className={`${styles.filterOption} ${completedFilterType === option.id ? styles.filterOptionActive : ''}`}
                            type="button"
                            onClick={() => {
                              setCompletedFilterType(option.id)
                              setIsCompletedFilterOpen(false)
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
                    <span className={styles.tableHeaderVotes}>Проголосовало</span>
                  </div>
                  {!contestStore.isLoading && !contestStore.error && filteredCompletedContests.length === 0 ? (
                    <p className={`${styles.helperText} ${styles.eventsHelperText}`}>Пока нет завершенных мероприятий</p>
                  ) : null}
                  {filteredCompletedContests.map((contest) => (
                    <ContestCard
                      contest={contest}
                      juryCabinetCompact
                      showVotedColumn
                      key={contest.id}
                      onOpen={() => navigate(`/cabinet/events/${contest.id}/results`)}
                    />
                  ))}
                </div>
              </section>
            ) : null}

              </>
            )}
          </div>
        ) : (
          <div className={styles.cabinetPlaceholder}>
            <p>
              {section === 'settings'
                ? 'Раздел настроек в разработке.'
                : 'Раздел информации в разработке.'}
            </p>
          </div>
        )}
      </div>
    </section>
  )
})
