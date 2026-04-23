import { observer } from 'mobx-react-lite'
import { useEffect, useRef, useState } from 'react'
import { NavLink, Navigate, useNavigate, useSearchParams } from 'react-router'
import { ContestCard, contestStore, getContestTypes, type IContest } from '@/entities/contest'
import { TemplateCard, templateStore } from '@/entities/template'
import { userStore } from '@/entities/user'
import { juryContestStore } from '@/features/jury-contest/model/juryContestStore'
import { resolveMediaUrl } from '@/shared'
import { BottomSheet } from '@/shared/ui/bottom-sheet/BottomSheet'
import { sortCriteriaRows } from '@/shared/lib/weightedScores'
import { formatRuPhoneMask } from '@/shared/lib/ruPhone'
import { OrganizerCabinetSidebar } from '@/widgets/organizer-cabinet-sidebar/OrganizerCabinetSidebar'
import { JuryCabinetSidebar } from '@/widgets/jury-cabinet-sidebar/JuryCabinetSidebar'
import styles from './CabinetPage.module.css'

type CabinetSection = 'events' | 'constructor' | 'settings' | 'info' | 'profile'

type CabinetPageProps = {
  section: CabinetSection
}

const COMMENT_LIMIT = 500

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export const CabinetPage = observer(({ section }: CabinetPageProps) => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const user = userStore.user
  const isOrganizer = user?.role === 'organizer'
  const [contestTypeOptions, setContestTypeOptions] = useState<{ id: string; label: string }[]>([])
  const [isPendingFilterOpen, setIsPendingFilterOpen] = useState(false)
  const [isRatedFilterOpen, setIsRatedFilterOpen] = useState(false)
  const [isCompletedFilterOpen, setIsCompletedFilterOpen] = useState(false)
  const [pendingFilterType, setPendingFilterType] = useState('all')
  const [ratedFilterType, setRatedFilterType] = useState('all')
  const [completedFilterType, setCompletedFilterType] = useState('all')
  const [isMobileViewport, setIsMobileViewport] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 450px)').matches : false,
  )
  const [touchDragFrom, setTouchDragFrom] = useState<number | null>(null)
  const [touchDragOver, setTouchDragOver] = useState<number | null>(null)
  const [isMobilePriorityConfirmOpen, setIsMobilePriorityConfirmOpen] = useState(false)
  const touchPointerIdRef = useRef<number | null>(null)
  const juryContestIdParam = searchParams.get('juryContestId')
  const juryContestId = juryContestIdParam ? Number.parseInt(juryContestIdParam, 10) : Number.NaN
  const isJuryContestModalOpen = !Number.isNaN(juryContestId) && section === 'events' && !isOrganizer

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

  useEffect(() => {
    const mediaQueryList = window.matchMedia('(max-width: 450px)')
    const onChange = (event: MediaQueryListEvent) => {
      setIsMobileViewport(event.matches)
    }
    setIsMobileViewport(mediaQueryList.matches)
    mediaQueryList.addEventListener('change', onChange)
    return () => {
      mediaQueryList.removeEventListener('change', onChange)
    }
  }, [])

  useEffect(() => {
    if (!user || !isJuryContestModalOpen || Number.isNaN(juryContestId)) {
      juryContestStore.reset()
      return
    }
    void juryContestStore.loadContest(juryContestId)
  }, [user, isJuryContestModalOpen, juryContestId])

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
      : section === 'profile'
        ? 'Профиль'
        : section === 'events' && !isOrganizer
          ? 'Мои мероприятия'
          : 'Мероприятия'
  const pendingContests = isOrganizer
    ? contestStore.organizerInProgressContests
    : contestStore.juryPendingContests
  const ratedContests = isOrganizer
    ? contestStore.organizerReadyToPublishContests
    : contestStore.juryRatedContests
  const completedContests = isOrganizer
    ? contestStore.organizerCompletedContests
    : contestStore.juryCompletedContests
  const hasNoOrganizerContests =
    isOrganizer &&
    pendingContests.length === 0 &&
    ratedContests.length === 0 &&
    completedContests.length === 0
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
  const isPriorityStepVisible =
    isJuryContestModalOpen &&
    Boolean(user && juryContestStore.view && juryContestStore.shouldShowCriteriaPriorityStep(user.id))
  const isCompletedContest = juryContestStore.view?.contest.status === 'completed'
  const isScoringStepVisible = isJuryContestModalOpen && Boolean(juryContestStore.view) && !isPriorityStepVisible
  const isScoreEditingLocked = juryContestStore.isScoreEditingLocked()
  const canStartRevote = juryContestStore.canRevote()

  const onLogout = async () => {
    await userStore.logout()
    navigate('/')
  }

  const closeJuryContestModal = () => {
    const nextSearchParams = new URLSearchParams(searchParams)
    nextSearchParams.delete('juryContestId')
    setSearchParams(nextSearchParams, { replace: true })
    setTouchDragFrom(null)
    setTouchDragOver(null)
    setIsMobilePriorityConfirmOpen(false)
    juryContestStore.reset()
  }

  const openJuryContestModal = (contestId: number) => {
    const nextSearchParams = new URLSearchParams(searchParams)
    nextSearchParams.set('juryContestId', String(contestId))
    setSearchParams(nextSearchParams, { replace: false })
  }

  const onJuryContestOpen = async (contest: IContest) => {
    if (!isMobileViewport) {
      navigate(`/cabinet/events/${contest.id}/jury`)
      return
    }
    openJuryContestModal(contest.id)
  }

  const onPriorityContinue = async () => {
    if (!user || Number.isNaN(juryContestId)) return
    await juryContestStore.confirmPriorityOrder(juryContestId, user.id)
    if (!juryContestStore.error) {
      setIsMobilePriorityConfirmOpen(false)
    }
  }

  const onSubmitScores = async () => {
    if (Number.isNaN(juryContestId)) return
    await juryContestStore.submit(juryContestId)
    await contestStore.fetchContests()
    if (!juryContestStore.error) {
      closeJuryContestModal()
    }
  }

  const onStartRevote = async () => {
    if (Number.isNaN(juryContestId)) return
    await juryContestStore.startRevote(juryContestId)
    await contestStore.fetchContests()
  }

  const onOpenResults = () => {
    if (Number.isNaN(juryContestId)) return
    closeJuryContestModal()
    navigate(`/cabinet/events/${juryContestId}/results`)
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
                onClick={() => void onLogout()}
                aria-label="Выйти из аккаунта"
              >
                <span className={styles.juryProfileSideBtnIcon} aria-hidden>
                  <img src="/exit/logout.svg" alt="" width={18} height={18} />
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
                  <img src="/card-edit.svg" alt="" width={18} height={18} />
                </span>
              </button>
            </div>
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
                <section className={styles.eventsCard}>
              {isOrganizer ? (
                <>
                  <div className={styles.sectionHeader}>
                    <div className={styles.sectionTitleWrap}>
                      <span className={`${styles.sectionDot} ${styles.sectionDotOrange}`}>
                        <span />
                      </span>
                      <h3 className={styles.sectionTitle}>Опубликовать результаты</h3>
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
                              key={`publish-${option.id}`}
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
                    {contestStore.isLoading ? <p className={`${styles.helperText} ${styles.eventsHelperText}`}>Загрузка мероприятий...</p> : null}
                    {contestStore.error ? <p className={styles.errorText}>{contestStore.error}</p> : null}
                    <div className={`${styles.tableHeader} ${styles.tableHeaderWithAction}`}>
                      <span className={styles.tableHeaderCover}>Обложка</span>
                      <span>Название конкурса</span>
                      <span>Дата</span>
                      <span>Тип конкурса</span>
                      <span className={styles.tableHeaderVotes}>Проголосовало</span>
                      <span className={styles.tableHeaderAction} />
                    </div>
                    {!contestStore.isLoading && !contestStore.error && filteredRatedContests.length === 0 ? (
                      <p className={`${styles.helperText} ${styles.eventsHelperText}`}>Пока нет мероприятий</p>
                    ) : null}
                    {filteredRatedContests.map((contest) => (
                      <ContestCard
                        contest={contest}
                        key={contest.id}
                        organizerLayout
                        onDelete={() => contestStore.deleteContest(contest.id)}
                        onOpen={() => navigate(`/cabinet/events/${contest.id}/organizer`)}
                      />
                    ))}
                  </div>
                </>
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
                    <div className={`${styles.tableHeader} ${styles.tableHeaderWithAction}`}>
                      <span className={styles.tableHeaderCover}>Обложка</span>
                      <span>Название конкурса</span>
                      <span>Дата</span>
                      <span>Тип конкурса</span>
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
                        key={contest.id}
                        onOpen={() => void onJuryContestOpen(contest)}
                      />
                    ))}
                  </div>
                </>
              )}
            </section>

                <section className={styles.eventsCard}>
              {isOrganizer ? (
                <>
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
                              key={`inprogress-${option.id}`}
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
                    <div className={`${styles.tableHeader} ${styles.tableHeaderWithAction}`}>
                      <span className={styles.tableHeaderCover}>Обложка</span>
                      <span>Название конкурса</span>
                      <span>Дата</span>
                      <span>Тип конкурса</span>
                      <span className={styles.tableHeaderVotes}>Проголосовало</span>
                      <span className={styles.tableHeaderAction} />
                    </div>
                    {!contestStore.isLoading && !contestStore.error && filteredPendingContests.length === 0 ? (
                      <p className={`${styles.helperText} ${styles.eventsHelperText}`}>Пока нет оцененных мероприятий</p>
                    ) : null}
                    {filteredPendingContests.map((contest) => (
                      <ContestCard
                        contest={contest}
                        key={contest.id}
                        organizerLayout
                        onDelete={() => contestStore.deleteContest(contest.id)}
                        onOpen={() => navigate(`/cabinet/events/${contest.id}/organizer`)}
                      />
                    ))}
                  </div>
                </>
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
                    </div>
                    {!contestStore.isLoading && !contestStore.error && filteredRatedContests.length === 0 ? (
                      <p className={`${styles.helperText} ${styles.eventsHelperText}`}>Пока нет оцененных мероприятий</p>
                    ) : null}
                    {filteredRatedContests.map((contest) => (
                      <ContestCard
                        contest={contest}
                        juryCabinetCompact
                        key={contest.id}
                        onOpen={() => void onJuryContestOpen(contest)}
                      />
                    ))}
                  </div>
                </>
              )}
            </section>

            {isOrganizer ? (
              <section className={styles.eventsCard}>
                <>
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
                              key={`completed-organizer-${option.id}`}
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
                      <span className={styles.tableHeaderAction} />
                    </div>
                    {!contestStore.isLoading && !contestStore.error && filteredCompletedContests.length === 0 ? (
                      <p className={`${styles.helperText} ${styles.eventsHelperText}`}>Пока нет завершенных мероприятий</p>
                    ) : null}
                    {filteredCompletedContests.map((contest) => (
                      <ContestCard
                        contest={contest}
                        key={contest.id}
                        organizerLayout
                        onDelete={() => contestStore.deleteContest(contest.id)}
                        onOpen={() => navigate(`/cabinet/events/${contest.id}/organizer`)}
                      />
                    ))}
                  </div>
                </>
              </section>
            ) : (
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
                  </div>
                  {!contestStore.isLoading && !contestStore.error && filteredCompletedContests.length === 0 ? (
                    <p className={`${styles.helperText} ${styles.eventsHelperText}`}>Пока нет завершенных мероприятий</p>
                  ) : null}
                  {filteredCompletedContests.map((contest) => (
                    <ContestCard
                      contest={contest}
                      juryCabinetCompact
                      key={contest.id}
                      onOpen={() => void onJuryContestOpen(contest)}
                    />
                  ))}
                </div>
              </section>
            )}

              </>
            )}
          </div>
        ) : (
          <div className={styles.cabinetPlaceholder}>
            <p>Раздел в разработке.</p>
          </div>
        )}
      </div>
      {isJuryContestModalOpen && isMobileViewport ? (
        <BottomSheet
          isOpen
          onClose={closeJuryContestModal}
          contentClassName={styles.juryPrioritySheetContent}
        >
          {juryContestStore.isLoading ? <p className={styles.helperText}>Загрузка мероприятия...</p> : null}
          {juryContestStore.error ? <p className={styles.errorText}>{juryContestStore.error}</p> : null}
          {isPriorityStepVisible && juryContestStore.view ? (
            <div className={styles.juryPriorityLayout}>
              <article className={styles.juryPriorityContestCard}>
                <p className={styles.juryPriorityContestDate}>
                  {new Date(juryContestStore.view.contest.createdAt).toLocaleDateString('ru-RU')}
                </p>
                <p className={styles.juryPriorityContestTitle}>{juryContestStore.view.contest.title}</p>
                <p className={styles.juryPriorityContestSubtitle}>
                  {juryContestStore.view.contest.description || 'Оценка конкурса'}
                </p>
              </article>

              <div className={styles.juryPriorityPanel}>
                <div className={styles.juryPriorityPanelHeader}>
                  <h3 className={styles.juryPriorityPanelTitle}>Приоритет показателей оценивания</h3>
                  <p className={styles.juryPriorityPanelHint}>Расставьте показатели по приоритетам</p>
                </div>
                {juryContestStore.priorityDraftIds.map((criterionId, index) => {
                  const criterion = juryContestStore.view?.criteria.find((criterionItem) => criterionItem.id === criterionId)
                  if (!criterion) return null
                  const isDragging = touchDragFrom === index
                  const isOver = touchDragOver === index && touchDragFrom !== null && touchDragFrom !== index
                  return (
                    <div
                      className={`${styles.juryPriorityRow} ${isDragging ? styles.juryPriorityRowDragging : ''} ${
                        isOver ? styles.juryPriorityRowDragOver : ''
                      }`}
                      data-priority-row-index={index}
                      key={criterionId}
                      onPointerDown={(event) => {
                        touchPointerIdRef.current = event.pointerId
                        setTouchDragFrom(index)
                        setTouchDragOver(index)
                        event.currentTarget.setPointerCapture(event.pointerId)
                      }}
                      onPointerMove={(event) => {
                        if (touchPointerIdRef.current !== event.pointerId) return
                        event.preventDefault()
                        const hoverElement = document.elementFromPoint(event.clientX, event.clientY)
                        const hoverRowElement = hoverElement?.closest('[data-priority-row-index]')
                        if (!hoverRowElement) return
                        const rawIndex = hoverRowElement.getAttribute('data-priority-row-index')
                        const overIndex = rawIndex ? Number.parseInt(rawIndex, 10) : Number.NaN
                        if (Number.isNaN(overIndex)) return
                        setTouchDragOver(overIndex)
                      }}
                      onPointerUp={(event) => {
                        if (touchPointerIdRef.current !== event.pointerId) return
                        const from = touchDragFrom
                        const to = touchDragOver
                        touchPointerIdRef.current = null
                        setTouchDragFrom(null)
                        setTouchDragOver(null)
                        if (from === null || to === null || from === to) return
                        juryContestStore.movePriorityCriterion(from, to)
                      }}
                      onPointerCancel={(event) => {
                        if (touchPointerIdRef.current !== event.pointerId) return
                        touchPointerIdRef.current = null
                        setTouchDragFrom(null)
                        setTouchDragOver(null)
                      }}
                    >
                      <div className={styles.juryPriorityNamePlate}>
                        <span className={styles.juryPriorityNameText}>{criterion.name}</span>
                        <span aria-hidden className={styles.juryPriorityDragHandle}>
                          ⋮⋮
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
              <button
                className={styles.juryPrioritySaveButton}
                disabled={juryContestStore.isSavingPriorityOrder}
                type="button"
                onClick={() => setIsMobilePriorityConfirmOpen(true)}
              >
                {juryContestStore.isSavingPriorityOrder ? 'Сохранение...' : 'Сохранить и продолжить'}
              </button>

              {isMobilePriorityConfirmOpen ? (
                <div className={styles.juryPriorityConfirmOverlay} onClick={() => setIsMobilePriorityConfirmOpen(false)}>
                  <div className={styles.juryPriorityConfirmModal} onClick={(event) => event.stopPropagation()}>
                    <div className={styles.juryPriorityConfirmBody}>
                      <div className={styles.juryPriorityConfirmTextGroup}>
                        <div className={styles.juryPriorityConfirmTitle}>
                          Вы уверены, что хотите сохранить указанные приоритеты?
                        </div>
                        <div className={styles.juryPriorityConfirmSubtitle}>Вы не сможете поменять приоритеты после</div>
                      </div>
                      <div className={styles.juryPriorityConfirmActions}>
                        <button
                          type="button"
                          className={styles.juryPriorityConfirmSaveButton}
                          disabled={juryContestStore.isSavingPriorityOrder}
                          onClick={() => void onPriorityContinue()}
                        >
                          Сохранить
                        </button>
                        <button
                          type="button"
                          className={styles.juryPriorityConfirmStayButton}
                          disabled={juryContestStore.isSavingPriorityOrder}
                          onClick={() => setIsMobilePriorityConfirmOpen(false)}
                        >
                          Остаться
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
          {isScoringStepVisible && juryContestStore.view ? (
            <div className={styles.juryScoreLayout}>
              <article className={styles.juryPriorityContestCard}>
                <p className={styles.juryPriorityContestDate}>{formatDate(juryContestStore.view.contest.createdAt)}</p>
                <p className={styles.juryPriorityContestTitle}>{juryContestStore.view.contest.title}</p>
                <p className={styles.juryPriorityContestSubtitle}>
                  {juryContestStore.view.contest.description || 'Оценка конкурса'}
                </p>
              </article>

              <div className={styles.juryScoreParticipantList}>
                {juryContestStore.view.participants.map((participant) => {
                  const photoUrl = resolveMediaUrl(participant.photoUrl)
                  return (
                    <details className={styles.juryScoreParticipantSection} key={participant.id}>
                      <summary className={styles.juryScoreParticipantSummary}>
                        <div className={styles.juryScoreParticipantMain}>
                          {photoUrl ? (
                            <img className={styles.juryScoreParticipantPhoto} src={photoUrl} alt={participant.fullName} />
                          ) : (
                            <div className={styles.juryScoreParticipantPhoto}>{getInitials(participant.fullName)}</div>
                          )}
                          <div className={styles.juryScoreParticipantMeta}>
                            <span className={styles.juryScoreParticipantName}>
                              {participant.fullName}
                              {participant.extraInfo ? `, ${participant.extraInfo}` : ''}
                            </span>
                            <span className={styles.juryScoreParticipantCountry}>
                              {participant.country || 'Страна не указана'}
                            </span>
                          </div>
                        </div>
                        <strong className={styles.juryScoreAverageBadge}>
                          {juryContestStore.getParticipantAverage(participant.id)} / 10
                        </strong>
                      </summary>

                      <div className={styles.juryScoreCriteriaWrap}>
                        {sortCriteriaRows(juryContestStore.view?.criteria ?? []).map((criterion) => {
                          const min = criterion.minScore ?? 0
                          const max = criterion.maxScore
                          const range = Math.max(1, max - min)
                          const value = juryContestStore.getScore(participant.id, criterion.id, min)
                          const clamped = Math.min(max, Math.max(min, value))
                          const percent = range > 0 ? ((clamped - min) / range) * 100 : 0
                          return (
                            <label className={styles.juryScoreCriterionRow} key={criterion.id}>
                              <div className={styles.juryScoreCriterionLabel}>{criterion.name}</div>
                              <div className={styles.juryScoreSliderWrap}>
                                <span className={styles.juryScoreBoundaryValue}>{min}</span>
                                <div className={styles.juryScoreSliderTrackWrap}>
                                  <div className={styles.juryScoreSliderTrack}>
                                    <div className={styles.juryScoreSliderProgress} style={{ width: `${percent}%` }} />
                                  </div>
                                  <input
                                    className={styles.juryScoreSliderInput}
                                    type="range"
                                    min={min}
                                    max={max}
                                    step={1}
                                    value={clamped}
                                    disabled={isScoreEditingLocked}
                                    onChange={(event) =>
                                      juryContestStore.setScore(participant.id, criterion.id, Number(event.target.value))
                                    }
                                  />
                                  <span className={styles.juryScoreSliderValue} style={{ left: `calc(${percent}% - 18px)` }}>
                                    {clamped}
                                  </span>
                                </div>
                                <span className={styles.juryScoreBoundaryValue}>{max}</span>
                              </div>
                            </label>
                          )
                        })}
                      </div>

                      <div className={styles.juryScoreCommentCard}>
                        <label className={styles.juryScoreCommentLabel} htmlFor={`sheet-comment-${participant.id}`}>
                          Комментарий для участника
                        </label>
                        <textarea
                          id={`sheet-comment-${participant.id}`}
                          className={styles.juryScoreCommentInput}
                          value={juryContestStore.getComment(participant.id)}
                          maxLength={COMMENT_LIMIT}
                          readOnly={isScoreEditingLocked}
                          placeholder="Оставьте обратную связь по выступлению"
                          onChange={(event) => juryContestStore.setComment(participant.id, event.target.value)}
                        />
                        <div className={styles.juryScoreCommentCounter}>
                          {juryContestStore.getComment(participant.id).length}
                          <span className={styles.juryScoreCommentDivider}>/</span>
                          {COMMENT_LIMIT}
                        </div>
                      </div>
                    </details>
                  )
                })}
              </div>

              {isCompletedContest ? (
                <button className={styles.juryPrioritySaveButton} type="button" onClick={onOpenResults}>
                  Результаты
                </button>
              ) : (
                <>
                  <button
                    className={styles.juryPrioritySaveButton}
                    disabled={!canStartRevote || juryContestStore.isRevokingSubmission || juryContestStore.isSubmitting}
                    type="button"
                    onClick={() => void onStartRevote()}
                  >
                    {juryContestStore.isRevokingSubmission ? 'Подготовка...' : 'Переголосовать'}
                  </button>
                  <button
                    className={styles.juryPrioritySaveButton}
                    disabled={
                      juryContestStore.isSubmitting ||
                      (Boolean(juryContestStore.view.mySubmitted) && !juryContestStore.isRevoteMode)
                    }
                    type="button"
                    onClick={() => void onSubmitScores()}
                  >
                    {juryContestStore.isSubmitting
                      ? 'Отправка...'
                      : juryContestStore.isRevoteMode
                        ? 'Отправить повторно'
                        : 'Завершить'}
                  </button>
                </>
              )}
            </div>
          ) : null}
        </BottomSheet>
      ) : null}
    </section>
  )
})
