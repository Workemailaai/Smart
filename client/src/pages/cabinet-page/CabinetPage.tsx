import { observer } from 'mobx-react-lite'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
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
const SCORE_UPDATE_DEBOUNCE_MS = 40
const TEMPLATE_CAROUSEL_SCROLL_STEP = 292
const HORIZONTAL_SCORE_SWIPE_THRESHOLD_PX = 10

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
  const [isMobileLeaveConfirmOpen, setIsMobileLeaveConfirmOpen] = useState(false)
  const touchPointerIdRef = useRef<number | null>(null)
  const scoreUpdateTimeoutIdRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingScoreUpdateRef = useRef<{ participantId: number; criterionId: number; value: number } | null>(null)
  const scoreSliderPointerStateRef = useRef<{
    pointerId: number | null
    startX: number
    startY: number
    isHorizontalSwipeLocked: boolean
    isVerticalScrollLocked: boolean
  }>({
    pointerId: null,
    startX: 0,
    startY: 0,
    isHorizontalSwipeLocked: false,
    isVerticalScrollLocked: false,
  })
  const templateCarouselReference = useRef<HTMLDivElement | null>(null)
  const prioritySheetContentReference = useRef<HTMLDivElement | null>(null)
  const prioritySaveButtonReference = useRef<HTMLButtonElement | null>(null)
  const hasAutoScrolledPriorityReference = useRef(false)
  const juryContestIdParam = searchParams.get('juryContestId')
  const juryContestId = juryContestIdParam ? Number.parseInt(juryContestIdParam, 10) : Number.NaN
  const isJuryContestModalOpen = !Number.isNaN(juryContestId) && section === 'events' && !isOrganizer
  const priorityDraftCount = juryContestStore.priorityDraftIds.length
  const hasJuryContestView = Boolean(juryContestStore.view)
  const [canScrollTemplatesLeft, setCanScrollTemplatesLeft] = useState(false)
  const [canScrollTemplatesRight, setCanScrollTemplatesRight] = useState(false)

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

  useEffect(() => {
    return () => {
      if (scoreUpdateTimeoutIdRef.current !== null) {
        clearTimeout(scoreUpdateTimeoutIdRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const carouselElement = templateCarouselReference.current
    if (!carouselElement || !isOrganizer || section !== 'constructor') {
      setCanScrollTemplatesLeft(false)
      setCanScrollTemplatesRight(false)
      return
    }

    const updateTemplateCarouselControls = () => {
      const maxScrollLeft = carouselElement.scrollWidth - carouselElement.clientWidth
      setCanScrollTemplatesLeft(carouselElement.scrollLeft > 2)
      setCanScrollTemplatesRight(maxScrollLeft - carouselElement.scrollLeft > 2)
    }

    updateTemplateCarouselControls()
    carouselElement.addEventListener('scroll', updateTemplateCarouselControls, { passive: true })
    window.addEventListener('resize', updateTemplateCarouselControls)

    return () => {
      carouselElement.removeEventListener('scroll', updateTemplateCarouselControls)
      window.removeEventListener('resize', updateTemplateCarouselControls)
    }
  }, [isOrganizer, section])

  useEffect(() => {
    if (!user || !isJuryContestModalOpen || !isMobileViewport) {
      hasAutoScrolledPriorityReference.current = false
      return
    }

    const shouldShowPriorityStep = hasJuryContestView && juryContestStore.shouldShowCriteriaPriorityStep(user.id)
    if (!shouldShowPriorityStep || priorityDraftCount <= 5) {
      hasAutoScrolledPriorityReference.current = false
      return
    }

    if (hasAutoScrolledPriorityReference.current) {
      return
    }

    const contentElement = prioritySheetContentReference.current
    const saveButtonElement = prioritySaveButtonReference.current
    if (!contentElement || !saveButtonElement) {
      return
    }

    requestAnimationFrame(() => {
      const nextScrollTop = Math.max(
        0,
        saveButtonElement.offsetTop - contentElement.clientHeight + saveButtonElement.offsetHeight + 12,
      )
      contentElement.scrollTo({ top: nextScrollTop, behavior: 'auto' })
      hasAutoScrolledPriorityReference.current = true
    })
  }, [
    user,
    isJuryContestModalOpen,
    isMobileViewport,
    hasJuryContestView,
    priorityDraftCount,
  ])

  const isPriorityStepVisible =
    isJuryContestModalOpen &&
    Boolean(user && juryContestStore.view && juryContestStore.shouldShowCriteriaPriorityStep(user.id))
  const isCompletedContest = juryContestStore.view?.contest.status === 'completed'
  const isScoringStepVisible = isJuryContestModalOpen && Boolean(juryContestStore.view) && !isPriorityStepVisible
  const isScoreEditingLocked = juryContestStore.isScoreEditingLocked()
  const canStartRevote = juryContestStore.canRevote()
  const hasUnsavedEvaluationDraft = juryContestStore.hasUnsavedEvaluationDraft()
  const shouldWarnOnMobileModalClose = isScoringStepVisible && hasUnsavedEvaluationDraft

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isJuryContestModalOpen || !shouldWarnOnMobileModalClose) return
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', onBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
    }
  }, [isJuryContestModalOpen, shouldWarnOnMobileModalClose])

  if (!userStore.isAuthCheckCompleted) {
    return (
      <section className={styles.page}>
        <div className={styles.content}>
          <p className={styles.helperText}>Проверка сессии...</p>
        </div>
      </section>
    )
  }

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
  const isTemplatesLoading = templateStore.isLoading
  const templatesError = templateStore.error
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

  const onTemplateOpen = (templateId: number) => {
    navigate(`/cabinet/constructor/new?templateId=${templateId}`)
  }

  const onTemplateCardKeyDown = (event: KeyboardEvent<HTMLDivElement>, templateId: number) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onTemplateOpen(templateId)
    }
  }

  const onTemplateDelete = async (templateId: number, templateName: string) => {
    const isDeleteConfirmed = window.confirm(`Удалить шаблон «${templateName}»?`)
    if (!isDeleteConfirmed) {
      return
    }
    await templateStore.deleteTemplate(templateId)
  }

  const scrollTemplatesLeft = () => {
    templateCarouselReference.current?.scrollBy({
      left: -TEMPLATE_CAROUSEL_SCROLL_STEP,
      behavior: 'smooth',
    })
  }

  const scrollTemplatesRight = () => {
    templateCarouselReference.current?.scrollBy({
      left: TEMPLATE_CAROUSEL_SCROLL_STEP,
      behavior: 'smooth',
    })
  }

  const closeJuryContestModal = () => {
    const nextSearchParams = new URLSearchParams(searchParams)
    nextSearchParams.delete('juryContestId')
    setSearchParams(nextSearchParams, { replace: true })
    setTouchDragFrom(null)
    setTouchDragOver(null)
    setIsMobilePriorityConfirmOpen(false)
    setIsMobileLeaveConfirmOpen(false)
    juryContestStore.reset()
  }

  const onRequestCloseJuryContestModal = () => {
    if (shouldWarnOnMobileModalClose) {
      setIsMobileLeaveConfirmOpen(true)
      return
    }
    closeJuryContestModal()
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

  const getScoreByPointerPosition = (params: {
    clientX: number
    trackElement: HTMLDivElement
    min: number
    max: number
  }) => {
    const { clientX, trackElement, min, max } = params
    const trackRect = trackElement.getBoundingClientRect()
    if (trackRect.width <= 0) return min

    const rawPercent = (clientX - trackRect.left) / trackRect.width
    const clampedPercent = Math.min(1, Math.max(0, rawPercent))
    const rawValue = min + clampedPercent * (max - min)
    return Math.round(rawValue)
  }

  const flushDebouncedScoreUpdate = () => {
    const pendingScoreUpdate = pendingScoreUpdateRef.current
    if (!pendingScoreUpdate) return
    juryContestStore.setScore(
      pendingScoreUpdate.participantId,
      pendingScoreUpdate.criterionId,
      pendingScoreUpdate.value,
    )
    pendingScoreUpdateRef.current = null
  }

  const scheduleDebouncedScoreUpdate = (params: { participantId: number; criterionId: number; value: number }) => {
    pendingScoreUpdateRef.current = params
    if (scoreUpdateTimeoutIdRef.current !== null) return

    scoreUpdateTimeoutIdRef.current = setTimeout(() => {
      scoreUpdateTimeoutIdRef.current = null
      flushDebouncedScoreUpdate()
    }, SCORE_UPDATE_DEBOUNCE_MS)
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
              <div className={styles.templatesHeader}>
                <p className={styles.templatesTitle}>Шаблоны</p>
                <div className={styles.templateCarouselActions}>
                  <button
                    type="button"
                    className={styles.templateCarouselButton}
                    onClick={scrollTemplatesLeft}
                    disabled={!canScrollTemplatesLeft}
                    aria-label="Прокрутить шаблоны влево"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    className={styles.templateCarouselButton}
                    onClick={scrollTemplatesRight}
                    disabled={!canScrollTemplatesRight}
                    aria-label="Прокрутить шаблоны вправо"
                  >
                    →
                  </button>
                </div>
              </div>
              <div className={styles.templateCarouselRow}>
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
                <div className={styles.templateGridWrap}>
                  <div className={styles.templateGrid} ref={templateCarouselReference}>
                    {isTemplatesLoading ? <p className={styles.helperText}>Загрузка шаблонов...</p> : null}
                    {templatesError ? <p className={styles.errorText}>{templatesError}</p> : null}
                    {!isTemplatesLoading && !templatesError
                      ? templates.map((template) => (
                          <div
                            key={template.id}
                            className={styles.templateCardBtn}
                            role="button"
                            tabIndex={0}
                            onClick={() => onTemplateOpen(template.id)}
                            onKeyDown={(event) => onTemplateCardKeyDown(event, template.id)}
                          >
                            <TemplateCard
                              template={template}
                              isDeleting={templateStore.deletingTemplateId === template.id}
                              onDelete={() => void onTemplateDelete(template.id, template.name)}
                            />
                          </div>
                        ))
                      : null}
                  </div>
                </div>
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
                    <div className={styles.tableHeader}>
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
                    <div className={`${styles.tableHeader} ${styles.tableHeaderWithAction}`}>
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
          onClose={onRequestCloseJuryContestModal}
          contentClassName={styles.juryPrioritySheetContent}
          contentRef={prioritySheetContentReference}
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
                ref={prioritySaveButtonReference}
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
                                <div
                                  className={styles.juryScoreSliderTrackWrap}
                                  onPointerDown={(event) => {
                                    if (isScoreEditingLocked) return
                                    scoreSliderPointerStateRef.current = {
                                      pointerId: event.pointerId,
                                      startX: event.clientX,
                                      startY: event.clientY,
                                      isHorizontalSwipeLocked: false,
                                      isVerticalScrollLocked: false,
                                    }
                                  }}
                                  onPointerMove={(event) => {
                                    if (isScoreEditingLocked) return
                                    const scoreSliderPointerState = scoreSliderPointerStateRef.current
                                    if (scoreSliderPointerState.pointerId !== event.pointerId) return
                                    if (!scoreSliderPointerState.isHorizontalSwipeLocked && !scoreSliderPointerState.isVerticalScrollLocked) {
                                      const deltaX = event.clientX - scoreSliderPointerState.startX
                                      const deltaY = event.clientY - scoreSliderPointerState.startY
                                      const absoluteDeltaX = Math.abs(deltaX)
                                      const absoluteDeltaY = Math.abs(deltaY)
                                      if (absoluteDeltaY > absoluteDeltaX && absoluteDeltaY >= HORIZONTAL_SCORE_SWIPE_THRESHOLD_PX) {
                                        scoreSliderPointerStateRef.current = {
                                          ...scoreSliderPointerState,
                                          isVerticalScrollLocked: true,
                                        }
                                        return
                                      }
                                      if (absoluteDeltaX >= HORIZONTAL_SCORE_SWIPE_THRESHOLD_PX) {
                                        scoreSliderPointerStateRef.current = {
                                          ...scoreSliderPointerState,
                                          isHorizontalSwipeLocked: true,
                                        }
                                        event.currentTarget.setPointerCapture(event.pointerId)
                                      } else {
                                        return
                                      }
                                    }
                                    if (scoreSliderPointerStateRef.current.isVerticalScrollLocked) return
                                    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
                                    event.preventDefault()
                                    const nextValue = getScoreByPointerPosition({
                                      clientX: event.clientX,
                                      trackElement: event.currentTarget,
                                      min,
                                      max,
                                    })
                                    scheduleDebouncedScoreUpdate({
                                      participantId: participant.id,
                                      criterionId: criterion.id,
                                      value: nextValue,
                                    })
                                  }}
                                  onPointerUp={(event) => {
                                    const scoreSliderPointerState = scoreSliderPointerStateRef.current
                                    if (scoreSliderPointerState.pointerId !== event.pointerId) return
                                    if (
                                      scoreSliderPointerState.isHorizontalSwipeLocked &&
                                      event.currentTarget.hasPointerCapture(event.pointerId)
                                    ) {
                                      const nextValue = getScoreByPointerPosition({
                                        clientX: event.clientX,
                                        trackElement: event.currentTarget,
                                        min,
                                        max,
                                      })
                                      pendingScoreUpdateRef.current = {
                                        participantId: participant.id,
                                        criterionId: criterion.id,
                                        value: nextValue,
                                      }
                                      flushDebouncedScoreUpdate()
                                      event.currentTarget.releasePointerCapture(event.pointerId)
                                    }
                                    scoreSliderPointerStateRef.current = {
                                      pointerId: null,
                                      startX: 0,
                                      startY: 0,
                                      isHorizontalSwipeLocked: false,
                                      isVerticalScrollLocked: false,
                                    }
                                  }}
                                  onPointerCancel={(event) => {
                                    const scoreSliderPointerState = scoreSliderPointerStateRef.current
                                    if (scoreSliderPointerState.pointerId !== event.pointerId) return
                                    if (
                                      scoreSliderPointerState.isHorizontalSwipeLocked &&
                                      event.currentTarget.hasPointerCapture(event.pointerId)
                                    ) {
                                      flushDebouncedScoreUpdate()
                                      event.currentTarget.releasePointerCapture(event.pointerId)
                                    }
                                    scoreSliderPointerStateRef.current = {
                                      pointerId: null,
                                      startX: 0,
                                      startY: 0,
                                      isHorizontalSwipeLocked: false,
                                      isVerticalScrollLocked: false,
                                    }
                                  }}
                                >
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

              {isMobileLeaveConfirmOpen ? (
                <div className={styles.juryPriorityConfirmOverlay} onClick={() => setIsMobileLeaveConfirmOpen(false)}>
                  <div className={styles.juryPriorityConfirmModal} onClick={(event) => event.stopPropagation()}>
                    <div className={styles.juryPriorityConfirmBody}>
                      <div className={styles.juryPriorityConfirmTextGroup}>
                        <div className={styles.juryPriorityConfirmTitle}>Вы уверены, что хотите завершить оценку мероприятия?</div>
                      </div>
                      <div className={styles.juryPriorityConfirmActions}>
                        <button
                          type="button"
                          className={styles.juryPriorityConfirmSaveButton}
                          disabled={juryContestStore.isSubmitting}
                          onClick={closeJuryContestModal}
                        >
                          Завершить
                        </button>
                        <button
                          type="button"
                          className={styles.juryPriorityConfirmStayButton}
                          disabled={juryContestStore.isSubmitting}
                          onClick={() => setIsMobileLeaveConfirmOpen(false)}
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
        </BottomSheet>
      ) : null}
    </section>
  )
})
