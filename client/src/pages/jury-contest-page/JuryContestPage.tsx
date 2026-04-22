import { observer } from 'mobx-react-lite'
import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import { userStore } from '@/entities/user'
import { juryContestStore } from '@/features/jury-contest/model/juryContestStore'
import { JuryCabinetSidebar } from '@/widgets/jury-cabinet-sidebar/JuryCabinetSidebar'
import { sortCriteriaRows } from '@/shared/lib/weightedScores.js'
import styles from './JuryContestPage.module.css'

const MEDIA_BASE_URL = import.meta.env.VITE_MEDIA_BASE_URL || 'http://localhost:3000'
const COMMENT_LIMIT = 500

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

function resolveMediaUrl(path: string | null) {
  if (!path) return null
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${MEDIA_BASE_URL}${normalized}`
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

  if (!user) return <Navigate replace to="/" />
  if (user.role !== 'jury') return <Navigate replace to="/cabinet/events" />

  const view = juryContestStore.view
  const userName = user.fullName || 'Пользователь'
  const isCompletedContest = view?.contest.status === 'completed'
  const showCriteriaPriorityStep = Boolean(
    view && user && !isCompletedContest && juryContestStore.shouldShowCriteriaPriorityStep(user.id),
  )

  const onLogout = async () => {
    await userStore.logout()
    navigate('/')
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
            onClick={() => navigate('/cabinet/events')}
          >
            ←
          </button>
          <button
            className={styles.priorityNextButton}
            disabled={juryContestStore.isSavingPriorityOrder}
            type="button"
            onClick={() => void juryContestStore.confirmPriorityOrder(numericContestId, user.id)}
          >
            {juryContestStore.isSavingPriorityOrder ? 'Сохранение...' : 'Далее'}
          </button>
        </div>
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
                            <label className={styles.criterionRow} key={criterion.id}>
                              <div className={styles.criterionLabel}>{criterion.name}</div>
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
                                    disabled={view.mySubmitted || isCompletedContest}
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
                            </label>
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
                          readOnly={view.mySubmitted || isCompletedContest}
                          placeholder="Оставьте обратную связь по выступлению"
                          onChange={(event) => juryContestStore.setComment(participant.id, event.target.value)}
                        />
                        <div className={styles.commentCounter}>
                          {juryContestStore.getComment(participant.id).length}
                          <span className={styles.commentDivider}>/</span>
                          {COMMENT_LIMIT}
                        </div>
                      </div>
                    </details>
                  )
                })}
              </div>

              <div className={styles.actions}>
                <button className={styles.backButton} type="button" onClick={() => navigate('/cabinet/events')}>
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
                    <button
                      type="button"
                      className={styles.primaryButton}
                      disabled={juryContestStore.isSubmitting || view.mySubmitted}
                      onClick={() => void juryContestStore.submit(numericContestId)}
                    >
                      {juryContestStore.isSubmitting ? 'Отправка...' : 'Завершить'}
                    </button>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </section>
  )
})
