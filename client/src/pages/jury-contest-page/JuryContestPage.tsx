import { observer } from 'mobx-react-lite'
import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import { contestStore } from '@/entities/contest'
import { userStore } from '@/entities/user'
import { juryContestStore } from '@/features/jury-contest/model/juryContestStore'
import { resolveMediaUrl } from '@/shared'
import { JuryCabinetSidebar } from '@/widgets/jury-cabinet-sidebar/JuryCabinetSidebar'
import { sortCriteriaRows } from '@/shared/lib/weightedScores'
import styles from './JuryContestPage.module.css'

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

export const JuryContestPage = observer(() => {
  const navigate = useNavigate()
  const { contestId } = useParams()
  const user = userStore.user
  const numericContestId = Number(contestId)

  useEffect(() => {
    if (Number.isFinite(numericContestId)) {
      void juryContestStore.loadContest(numericContestId)
    }
    return () => {
      juryContestStore.reset()
    }
  }, [numericContestId])

  const [priorityDragFrom, setPriorityDragFrom] = useState<number | null>(null)
  const [priorityDragOver, setPriorityDragOver] = useState<number | null>(null)
  const [isPriorityConfirmOpen, setIsPriorityConfirmOpen] = useState(false)
  const [isLeaveConfirmOpen, setIsLeaveConfirmOpen] = useState(false)

  const view = juryContestStore.view
  const isCompletedContest = view?.contest.status === 'completed'
  const showCriteriaPriorityStep = Boolean(
    view && user && !isCompletedContest && juryContestStore.shouldShowCriteriaPriorityStep(user.id),
  )
  const isScoreEditingLocked = juryContestStore.isScoreEditingLocked()
  const canStartRevote = juryContestStore.canRevote()
  const hasUnsavedEvaluationDraft = juryContestStore.hasUnsavedEvaluationDraft()
  const shouldWarnOnExit = Boolean(user && !showCriteriaPriorityStep && hasUnsavedEvaluationDraft)

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!shouldWarnOnExit) return
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', onBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
    }
  }, [shouldWarnOnExit])

  if (!userStore.isAuthCheckCompleted) return <p className={styles.infoText}>Проверка сессии...</p>
  if (!user) return <Navigate replace to="/" />
  if (user.role !== 'jury') return <Navigate replace to="/cabinet/events" />

  const userName = user.fullName || 'Пользователь'

  const onLogout = async () => {
    await userStore.logout()
    navigate('/')
  }

  const onStartRevote = async () => {
    if (!Number.isFinite(numericContestId)) return
    await juryContestStore.startRevote(numericContestId)
    await contestStore.fetchContests()
  }

  const onSubmitScores = async () => {
    if (!Number.isFinite(numericContestId)) return
    await juryContestStore.submit(numericContestId)
    await contestStore.fetchContests()
    if (!juryContestStore.error) {
      navigate('/cabinet/events')
    }
  }

  const onConfirmPriorityOrder = async () => {
    if (!view || !user || !Number.isFinite(numericContestId)) return
    await juryContestStore.confirmPriorityOrder(numericContestId, user.id)
    if (!juryContestStore.error) {
      setIsPriorityConfirmOpen(false)
    }
  }

  const onRequestLeaveToEvents = () => {
    if (shouldWarnOnExit) {
      setIsLeaveConfirmOpen(true)
      return
    }
    navigate('/cabinet/events')
  }

  const priorityStepContent =
    view && showCriteriaPriorityStep ? (
      <div className={styles.priorityLayout}>
        <article className={styles.contestCard}>
          <p className={styles.contestDate}>{formatDate(view.contest.createdAt)}</p>
          <p className={styles.contestTitle}>{view.contest.title}</p>
          <p className={styles.contestSubtitle}>{view.contest.description || 'Оценка конкурса'}</p>
        </article>

        <div className={styles.priorityPanel}>
          <div className={styles.priorityPanelHeader}>
            <h3 className={styles.priorityPanelTitle}>Приоритет показателей оценивания</h3>
            <p className={styles.priorityPanelHint}>Расставьте показатели по приоритетам</p>
          </div>
          {juryContestStore.priorityDraftIds.map((criterionId, index) => {
            const criterion = view.criteria.find((criterionItem) => criterionItem.id === criterionId)
            if (!criterion) return null
            const isDragging = priorityDragFrom === index
            const isOver = priorityDragOver === index && priorityDragFrom !== null && priorityDragFrom !== index
            return (
              <div
                className={`${styles.priorityRow} ${isDragging ? styles.priorityRowDragging : ''} ${
                  isOver ? styles.priorityRowDragOver : ''
                }`}
                draggable
                key={criterionId}
                onDragEnd={() => {
                  setPriorityDragFrom(null)
                  setPriorityDragOver(null)
                }}
                onDragOver={(event) => {
                  if (priorityDragFrom === null) return
                  event.preventDefault()
                  event.dataTransfer.dropEffect = 'move'
                  setPriorityDragOver(index)
                }}
                onDragStart={(event) => {
                  event.dataTransfer.setData('text/plain', String(index))
                  event.dataTransfer.effectAllowed = 'move'
                  setPriorityDragFrom(index)
                }}
                onDrop={(event) => {
                  event.preventDefault()
                  const raw = event.dataTransfer.getData('text/plain')
                  const from = Number.parseInt(raw, 10)
                  if (Number.isNaN(from)) {
                    setPriorityDragFrom(null)
                    setPriorityDragOver(null)
                    return
                  }
                  juryContestStore.movePriorityCriterion(from, index)
                  setPriorityDragFrom(null)
                  setPriorityDragOver(null)
                }}
              >
                <div className={styles.priorityIndexBadge}>{index + 1}</div>
                <div className={styles.priorityNamePlate}>
                  <span className={styles.priorityNameText}>{criterion.name}</span>
                </div>
              </div>
            )
          })}
        </div>

        <div className={styles.priorityActions}>
          <button
            aria-label="Назад к списку мероприятий"
            className={styles.priorityBackCircle}
            type="button"
            onClick={onRequestLeaveToEvents}
          >
            ←
          </button>
          <button
            className={styles.priorityNextButton}
            disabled={juryContestStore.isSavingPriorityOrder}
            type="button"
            onClick={() => setIsPriorityConfirmOpen(true)}
          >
            {juryContestStore.isSavingPriorityOrder ? 'Сохранение...' : 'Далее'}
          </button>
        </div>

        {isPriorityConfirmOpen ? (
          <div className={styles.priorityConfirmOverlay} onClick={() => setIsPriorityConfirmOpen(false)}>
            <div className={styles.priorityConfirmModal} onClick={(event) => event.stopPropagation()}>
              <div className={styles.priorityConfirmBody}>
                <div className={styles.priorityConfirmTextGroup}>
                  <div className={styles.priorityConfirmTitle}>
                    Вы уверены, что хотите сохранить указанные приоритеты?
                  </div>
                  <div className={styles.priorityConfirmSubtitle}>Вы не сможете поменять приоритеты после</div>
                </div>
                <div className={styles.priorityConfirmActions}>
                  <button
                    type="button"
                    className={styles.priorityConfirmAcceptButton}
                    disabled={juryContestStore.isSavingPriorityOrder}
                    onClick={() => void onConfirmPriorityOrder()}
                  >
                    Далее
                  </button>
                  <button
                    type="button"
                    className={styles.priorityConfirmStayButton}
                    disabled={juryContestStore.isSavingPriorityOrder}
                    onClick={() => setIsPriorityConfirmOpen(false)}
                  >
                    Остаться
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    ) : null

  return (
    <section className={styles.page}>
      <JuryCabinetSidebar fullName={userName} phone={user.phone} onLogout={onLogout} />

      <div className={styles.content}>
        <header className={styles.topBar}>
          <h2 className={styles.topTitle}>Мероприятия</h2>
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

        <div className={styles.main}>
          {!showCriteriaPriorityStep ? <h3 className={styles.pageHeading}>Оцените участников</h3> : null}

          {juryContestStore.isLoading ? <p className={styles.infoText}>Загрузка мероприятия...</p> : null}
          {juryContestStore.error ? <p className={styles.errorText}>{juryContestStore.error}</p> : null}

          {view && showCriteriaPriorityStep ? priorityStepContent : null}

          {view && !showCriteriaPriorityStep ? (
            <>
              <article className={styles.contestCard}>
                <p className={styles.contestDate}>{formatDate(view.contest.createdAt)}</p>
                <p className={styles.contestTitle}>{view.contest.title}</p>
                <p className={styles.contestSubtitle}>{view.contest.description || 'Оценка конкурса'}</p>
              </article>

              <div className={styles.participantList}>
                {view.participants.map((participant) => {
                  const photoUrl = resolveMediaUrl(participant.photoUrl)
                  const isCommentSaving = juryContestStore.isCommentSaving(participant.id)
                  const isAnyCommentSaving = juryContestStore.isAnyCommentSaving()
                  const commentSaveErrorText = juryContestStore.getCommentSaveError(participant.id)
                  return (
                    <details className={styles.participantSection} key={participant.id}>
                      <summary className={styles.participantSummary}>
                        <div className={styles.participantMain}>
                          {photoUrl ? (
                            <img className={styles.participantPhoto} src={photoUrl} alt={participant.fullName} />
                          ) : (
                            <div className={styles.participantPhoto}>{getInitials(participant.fullName)}</div>
                          )}
                          <div className={styles.participantMeta}>
                            <span className={styles.participantName}>
                              {participant.fullName}
                              {participant.extraInfo ? `, ${participant.extraInfo}` : ''}
                            </span>
                            <span className={styles.participantCountry}>{participant.country || 'Страна не указана'}</span>
                          </div>
                          <button
                            className={styles.favoriteButton}
                            type="button"
                            disabled={isScoreEditingLocked}
                            aria-pressed={juryContestStore.isParticipantFavorite(participant.id)}
                            aria-label={
                              juryContestStore.isParticipantFavorite(participant.id)
                                ? 'Убрать участника из избранного'
                                : 'Добавить участника в избранное'
                            }
                            onClick={(event) => {
                              event.preventDefault()
                              event.stopPropagation()
                              juryContestStore.toggleParticipantFavorite(participant.id)
                            }}
                          >
                            <img
                              src={
                                juryContestStore.isParticipantFavorite(participant.id)
                                  ? '/red-heart-4_128x128.svg'
                                  : '/heart-alt-2_128x128.svg'
                              }
                              alt=""
                              aria-hidden
                            />
                          </button>
                        </div>
                        <strong className={styles.averageBadge}>{juryContestStore.getParticipantAverage(participant.id)} / 10</strong>
                      </summary>

                      <div className={styles.criteriaWrap}>
                        {sortCriteriaRows(view.criteria).map((criterion) => {
                          const min = criterion.minScore ?? 0
                          const max = criterion.maxScore
                          const range = Math.max(1, max - min)
                          const value = juryContestStore.getScore(participant.id, criterion.id, min)
                          const clamped = Math.min(max, Math.max(min, value))
                          const percent = range > 0 ? ((clamped - min) / range) * 100 : 0
                          return (
                            <div className={styles.criterionRow} key={criterion.id}>
                              <div className={styles.criterionHead}>
                                <div className={styles.criterionLabel}>{criterion.name}</div>
                                <button
                                  className={styles.favoriteButton}
                                  type="button"
                                  disabled={isScoreEditingLocked}
                                  aria-pressed={juryContestStore.isCriterionFavorite(participant.id, criterion.id)}
                                  aria-label={
                                    juryContestStore.isCriterionFavorite(participant.id, criterion.id)
                                      ? 'Убрать показатель из избранного'
                                      : 'Добавить показатель в избранное'
                                  }
                                  onClick={(event) => {
                                    event.preventDefault()
                                    event.stopPropagation()
                                    juryContestStore.toggleCriterionFavorite(participant.id, criterion.id)
                                  }}
                                >
                                  <img
                                    src={
                                      juryContestStore.isCriterionFavorite(participant.id, criterion.id)
                                        ? '/red-heart-4_128x128.svg'
                                        : '/heart-alt-2_128x128.svg'
                                    }
                                    alt=""
                                    aria-hidden
                                  />
                                </button>
                              </div>
                              <div className={styles.sliderWrap}>
                                <span className={styles.boundaryValue}>{min}</span>
                                <div className={styles.sliderTrackWrap}>
                                  <div className={styles.sliderTrack}>
                                    <div className={styles.sliderProgress} style={{ width: `${percent}%` }} />
                                  </div>
                                  <input
                                    className={styles.sliderInput}
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
                                  <span className={styles.sliderValue} style={{ left: `calc(${percent}% - 24px)` }}>
                                    {clamped}
                                  </span>
                                </div>
                                <span className={styles.boundaryValue}>{max}</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      <div className={styles.commentCard}>
                        <label className={styles.commentLabel} htmlFor={`comment-${participant.id}`}>
                          Комментарий для участника
                        </label>
                        <textarea
                          id={`comment-${participant.id}`}
                          className={styles.commentInput}
                          value={juryContestStore.getComment(participant.id)}
                          maxLength={COMMENT_LIMIT}
                          readOnly={isScoreEditingLocked}
                          placeholder="Оставьте обратную связь по выступлению"
                          onChange={(event) => juryContestStore.setComment(participant.id, event.target.value)}
                        />
                        <div className={styles.commentFooter}>
                          <div className={styles.commentCounter}>
                            {juryContestStore.getComment(participant.id).length}
                            <span className={styles.commentDivider}>/</span>
                            {COMMENT_LIMIT}
                          </div>
                          <button
                            className={styles.commentSaveButton}
                            type="button"
                            disabled={isScoreEditingLocked || juryContestStore.isSubmitting || isAnyCommentSaving}
                            onClick={() => void juryContestStore.saveCommentDraft(numericContestId, participant.id)}
                          >
                            {isCommentSaving ? 'Сохранение...' : 'Сохранить'}
                          </button>
                        </div>
                        {commentSaveErrorText ? <p className={styles.commentSaveError}>{commentSaveErrorText}</p> : null}
                      </div>
                    </details>
                  )
                })}
              </div>

              <div className={styles.actions}>
                <button className={styles.backButton} type="button" onClick={onRequestLeaveToEvents}>
                  ←
                </button>
                <div className={styles.actionsRight}>
                  {isCompletedContest ? (
                    <button
                      type="button"
                      className={styles.primaryButton}
                      onClick={() => navigate(`/cabinet/events/${numericContestId}/results`)}
                    >
                      Результаты
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        className={styles.primaryButton}
                        disabled={!canStartRevote || juryContestStore.isRevokingSubmission || juryContestStore.isSubmitting}
                        onClick={() => void onStartRevote()}
                      >
                        {juryContestStore.isRevokingSubmission ? 'Подготовка...' : 'Переголосовать'}
                      </button>
                      <button
                        type="button"
                        className={styles.primaryButton}
                        disabled={juryContestStore.isSubmitting || (view.mySubmitted && !juryContestStore.isRevoteMode)}
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
              </div>

              {isLeaveConfirmOpen ? (
                <div className={styles.priorityConfirmOverlay} onClick={() => setIsLeaveConfirmOpen(false)}>
                  <div className={styles.priorityConfirmModal} onClick={(event) => event.stopPropagation()}>
                    <div className={styles.priorityConfirmBody}>
                      <div className={styles.priorityConfirmTextGroup}>
                        <div className={styles.priorityConfirmTitle}>Вы уверены, что хотите покинуть страницу оценок?</div>
                        <div className={styles.priorityConfirmSubtitle}>Изменения оценок не будут сохранены</div>
                      </div>
                      <div className={styles.priorityConfirmActions}>
                        <button
                          type="button"
                          className={styles.priorityConfirmAcceptButton}
                          disabled={juryContestStore.isSubmitting}
                          onClick={() => navigate('/cabinet/events')}
                        >
                          Покинуть
                        </button>
                        <button
                          type="button"
                          className={styles.priorityConfirmStayButton}
                          disabled={juryContestStore.isSubmitting}
                          onClick={() => setIsLeaveConfirmOpen(false)}
                        >
                          Остаться
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </section>
  )
})
