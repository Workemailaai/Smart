import { observer } from 'mobx-react-lite'
import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router'
import { contestStore } from '@/entities/contest'
import { templateStore } from '@/entities/template'
import { userStore } from '@/entities/user'
import { juryContestStore } from '@/features/jury-contest/model/juryContestStore'
import {
  JuryMobileContestSheet,
  useJuryMobileContestActions,
  useJuryContestOpening,
  useJuryMobileContestSheet,
  useJuryMobileContestSheetEffects,
} from '@/features/jury-mobile-contest-sheet'
import { useTemplateCarousel } from '@/features/template-carousel'
import { formatRuPhoneMask } from '@/shared/lib/ruPhone'
import { ConstructorWidget } from '@/widgets/cabinet-constructor'
import { CabinetEventsSection } from '@/widgets/cabinet-events-section'
import { JuryBottomNav } from '@/widgets/cabinet-jury-bottom-nav'
import { JuryProfileWidget } from '@/widgets/cabinet-jury-profile'
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
  const [isMobileViewport, setIsMobileViewport] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 450px)').matches : false,
  )
  const prioritySheetContentReference = useRef<HTMLDivElement | null>(null)
  const prioritySaveButtonReference = useRef<HTMLButtonElement | null>(null)
  const juryContestIdParam = searchParams.get('juryContestId')
  const juryContestId = juryContestIdParam ? Number.parseInt(juryContestIdParam, 10) : Number.NaN
  const isJuryContestModalOpen = !Number.isNaN(juryContestId) && section === 'events' && !isOrganizer
  const {
    carouselReference: templateCarouselReference,
    canScrollLeft: canScrollTemplatesLeft,
    canScrollRight: canScrollTemplatesRight,
    scrollLeft: scrollTemplatesLeft,
    scrollRight: scrollTemplatesRight,
  } = useTemplateCarousel({
    isEnabled: isOrganizer && section === 'constructor',
    scrollStep: TEMPLATE_CAROUSEL_SCROLL_STEP,
  })

  useEffect(() => {
    void contestStore.fetchContests()
  }, [])

  useEffect(() => {
    if (isOrganizer) {
      void templateStore.fetchTemplates()
    }
  }, [isOrganizer])

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

  const isPriorityStepVisible =
    isJuryContestModalOpen &&
    Boolean(user && juryContestStore.view && juryContestStore.shouldShowCriteriaPriorityStep(user.id))
  const isCompletedContest = juryContestStore.view?.contest.status === 'completed'
  const isScoringStepVisible = isJuryContestModalOpen && Boolean(juryContestStore.view) && !isPriorityStepVisible
  const isScoreEditingLocked = juryContestStore.isScoreEditingLocked()
  const canStartRevote = juryContestStore.canRevote()
  const hasUnsavedEvaluationDraft = juryContestStore.hasUnsavedEvaluationDraft()
  const shouldWarnOnMobileModalClose = isScoringStepVisible && hasUnsavedEvaluationDraft
  const {
    touchDragFrom,
    touchDragOver,
    isMobilePriorityConfirmOpen,
    isMobileLeaveConfirmOpen,
    pendingScoreUpdateReference,
    scoreSliderPointerStateReference,
    openPriorityConfirm,
    closePriorityConfirm,
    closeLeaveConfirm,
    closeModal: closeJuryContestModal,
    requestCloseModal: onRequestCloseJuryContestModal,
    getScoreByPointerPosition,
    flushDebouncedScoreUpdate,
    scheduleDebouncedScoreUpdate,
    startPriorityDrag,
    movePriorityDrag,
    endPriorityDrag,
    cancelPriorityDrag,
  } = useJuryMobileContestSheet({
    searchParams,
    setSearchParams,
    shouldWarnOnMobileModalClose,
    scoreUpdateDebounceMs: SCORE_UPDATE_DEBOUNCE_MS,
  })

  useJuryMobileContestSheetEffects({
    userId: user?.id,
    isJuryContestModalOpen,
    isMobileViewport,
    prioritySheetContentReference,
    prioritySaveButtonReference,
    shouldWarnOnMobileModalClose,
  })

  const { onJuryContestOpen } = useJuryContestOpening({
    isMobileViewport,
    navigate,
    searchParams,
    setSearchParams,
  })

  const { onPriorityContinue, onSubmitScores, onStartRevote, onOpenResults } = useJuryMobileContestActions({
    juryContestId,
    userId: user?.id,
    closeModal: closeJuryContestModal,
    closePriorityConfirm,
    navigate,
  })

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
  const templates = templateStore.templates
  const isTemplatesLoading = templateStore.isLoading
  const templatesError = templateStore.error

  const onLogout = async () => {
    await userStore.logout()
    navigate('/')
  }

  const onTemplateOpen = (templateId: number) => {
    navigate(`/cabinet/constructor/edit/${templateId}`)
  }

  const onTemplateDelete = async (templateId: number, templateName: string) => {
    const isDeleteConfirmed = window.confirm(`Удалить шаблон «${templateName}»?`)
    if (!isDeleteConfirmed) {
      return
    }
    await templateStore.deleteTemplate(templateId)
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

      {!isOrganizer ? <JuryBottomNav /> : null}

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
          <ConstructorWidget
            templates={templates}
            isTemplatesLoading={isTemplatesLoading}
            templatesError={templatesError}
            deletingTemplateId={templateStore.deletingTemplateId}
            canScrollLeft={canScrollTemplatesLeft}
            canScrollRight={canScrollTemplatesRight}
            onCreateEvent={() => navigate('/cabinet/constructor/new')}
            onOpenTemplate={onTemplateOpen}
            onDeleteTemplate={onTemplateDelete}
            onScrollLeft={scrollTemplatesLeft}
            onScrollRight={scrollTemplatesRight}
            onGridReferenceChange={(element) => {
              templateCarouselReference.current = element
            }}
          />
        ) : section === 'profile' && !isOrganizer ? (
          <JuryProfileWidget
            fullName={fullName}
            phoneMask={formatRuPhoneMask(user.phone)}
            roleTitle={roleTitle}
            initials={getInitials(fullName)}
            onLogout={onLogout}
          />
        ) : section === 'events' ? (
          <CabinetEventsSection isOrganizer={isOrganizer} onJuryContestOpen={onJuryContestOpen} />
        ) : (
          <div className={styles.cabinetPlaceholder}>
            <p>Раздел в разработке.</p>
          </div>
        )}
      </div>
      <JuryMobileContestSheet
        juryContestStore={juryContestStore}
        commentLimit={COMMENT_LIMIT}
        horizontalSwipeThresholdPx={HORIZONTAL_SCORE_SWIPE_THRESHOLD_PX}
        isOpen={isJuryContestModalOpen && isMobileViewport}
        isPriorityStepVisible={isPriorityStepVisible}
        isScoringStepVisible={isScoringStepVisible}
        isScoreEditingLocked={isScoreEditingLocked}
        isCompletedContest={isCompletedContest}
        canStartRevote={canStartRevote}
        isMobilePriorityConfirmOpen={isMobilePriorityConfirmOpen}
        isMobileLeaveConfirmOpen={isMobileLeaveConfirmOpen}
        touchDragFrom={touchDragFrom}
        touchDragOver={touchDragOver}
        prioritySheetContentReference={prioritySheetContentReference}
        prioritySaveButtonReference={prioritySaveButtonReference}
        pendingScoreUpdateReference={pendingScoreUpdateReference}
        scoreSliderPointerStateReference={scoreSliderPointerStateReference}
        onRequestClose={onRequestCloseJuryContestModal}
        onPriorityContinue={onPriorityContinue}
        onOpenPriorityConfirm={openPriorityConfirm}
        onClosePriorityConfirm={closePriorityConfirm}
        onCloseLeaveConfirm={closeLeaveConfirm}
        onPriorityDragStart={startPriorityDrag}
        onPriorityDragMove={movePriorityDrag}
        onPriorityDragEnd={endPriorityDrag}
        onPriorityDragCancel={cancelPriorityDrag}
        getScoreByPointerPosition={getScoreByPointerPosition}
        scheduleDebouncedScoreUpdate={scheduleDebouncedScoreUpdate}
        flushDebouncedScoreUpdate={flushDebouncedScoreUpdate}
        onStartRevote={onStartRevote}
        onSubmitScores={onSubmitScores}
        onOpenResults={onOpenResults}
        onCloseSheetWithConfirm={closeJuryContestModal}
        getInitials={getInitials}
        formatDate={formatDate}
      />
    </section>
  )
})
