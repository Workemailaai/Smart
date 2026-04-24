import { observer } from 'mobx-react-lite'
import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import { userStore } from '@/entities/user'
import { organizerContestStore } from '@/features/organizer-contest/model/organizerContestStore'
import { resolveMediaUrl } from '@/shared'
import { formatRuPhoneMask } from '@/shared/lib/ruPhone'
import { OrganizerCabinetSidebar } from '@/widgets/organizer-cabinet-sidebar/OrganizerCabinetSidebar'
import styles from './OrganizerContestPage.module.css'

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

/** Балл для отображения: «9,45»; при отсутствии числа — «—» */
function formatScoreValue(value: number | null | undefined) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  return n.toFixed(2).replace('.', ',')
}

function scoreForSort(value: number | null | undefined): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : -Infinity
}

export const OrganizerContestPage = observer(() => {
  const navigate = useNavigate()
  const user = userStore.user
  const { contestId } = useParams()
  const numericContestId = Number(contestId)
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (Number.isFinite(numericContestId)) {
      void organizerContestStore.loadContest(numericContestId)
    }
    setExpandedComments({})
    return () => organizerContestStore.reset()
  }, [numericContestId])

  if (!userStore.isAuthCheckCompleted) return <p className={styles.infoText}>Проверка сессии...</p>
  if (!user) return <Navigate replace to="/" />
  if (user.role !== 'organizer') return <Navigate replace to="/cabinet/events" />

  const view = organizerContestStore.view
  const fullName = user.fullName || 'Пользователь'
  const submittedJuryCount = view?.submittedJuryCount ?? 0
  const totalJuryCount = view?.totalJuryCount ?? 0
  const hasAllJurySubmitted = totalJuryCount > 0 && submittedJuryCount >= totalJuryCount

  const onLogout = async () => {
    await userStore.logout()
    navigate('/')
  }

  const toggleComment = (participantId: number, juryId: number) => {
    const key = `${participantId}_${juryId}`
    setExpandedComments((current) => ({
      ...current,
      [key]: !current[key],
    }))
  }

  const handleCompleteContest = async () => {
    await organizerContestStore.complete(numericContestId)
    if (!organizerContestStore.error) {
      navigate(`/cabinet/events/${numericContestId}/results`, { replace: true })
    }
  }

  return (
    <section className={styles.page}>
      <OrganizerCabinetSidebar fullName={fullName} phone={user.phone} onLogout={onLogout} />

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
          {organizerContestStore.isLoading ? <p className={styles.infoText}>Загрузка мероприятия...</p> : null}
          {organizerContestStore.error ? <p className={styles.errorText}>{organizerContestStore.error}</p> : null}

          {view ? (
            <>
              <article className={styles.contestCard}>
                <div className={styles.contestInfo}>
                  <p className={styles.contestDate}>{formatDate(view.contest.createdAt)}</p>
                  <p className={styles.contestTitle}>{view.contest.title}</p>
                  <p className={styles.contestSubtitle}>{view.contest.description || 'Оценка конкурса'}</p>
                </div>
                <div className={styles.votedBadge}>
                  <span className={styles.votedLabel}>Проголосовало:</span>
                  <div className={styles.votedCountWrap}>
                    <span
                      className={`${styles.votedCountCurrent} ${
                        hasAllJurySubmitted ? styles.votedCountCurrentComplete : ''
                      }`}
                    >
                      {submittedJuryCount}
                    </span>
                    <span className={styles.votedCountDivider}>/</span>
                    <span className={styles.votedCountTotal}>{totalJuryCount}</span>
                  </div>
                </div>
              </article>

              <div className={styles.participantSections}>
                {[...view.participants]
                  .sort((a, b) => scoreForSort(b.overallAverage) - scoreForSort(a.overallAverage))
                  .map((participant, index) => {
                  const rank = index + 1
                  const isTopThree = rank <= 3
                  const participantPhoto = resolveMediaUrl(participant.photoUrl)
                  return (
                    <details
                      className={`${styles.participantSection} ${isTopThree ? styles.participantSectionTop : ''}`}
                      key={participant.id}
                    >
                      <summary className={styles.participantSummary}>
                        <div className={styles.participantMain}>
                          {participantPhoto ? (
                            <img className={styles.participantPhoto} src={participantPhoto} alt={participant.fullName} />
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
                        <div className={styles.scoreRankCluster}>
                          <div className={styles.scorePill}>
                            <span className={styles.scoreValue}>{formatScoreValue(participant.overallAverage)}</span>
                            <span className={styles.scoreSlash}>/</span>
                            <span className={styles.scoreMax}>10</span>
                          </div>
                          <div
                            className={`${styles.rankBadge} ${isTopThree ? styles.rankBadgeFilled : styles.rankBadgeOutline}`}
                          >
                            {rank}
                          </div>
                        </div>
                      </summary>

                      <div className={styles.juryCards}>
                        {participant.juryCards.map((juryCard) => {
                          const juryPhoto = resolveMediaUrl(juryCard.photoUrl)
                          const comment = juryCard.comment.trim()
                          const commentKey = `${participant.id}_${juryCard.juryId}`
                          const isCommentExpanded = Boolean(expandedComments[commentKey])
                          return (
                            <article className={styles.juryCard} key={juryCard.juryId}>
                              <div className={styles.juryHeader}>
                                {juryPhoto ? (
                                  <img className={styles.juryAvatar} src={juryPhoto} alt={juryCard.fullName} />
                                ) : (
                                  <div className={styles.juryAvatar}>{getInitials(juryCard.fullName)}</div>
                                )}
                                <div className={styles.juryMeta}>
                                  <p className={styles.juryName}>{juryCard.fullName}</p>
                                  <p className={styles.juryPhone}>{formatRuPhoneMask(juryCard.phone)}</p>
                                </div>
                              </div>

                              <div className={styles.criteriaBlock}>
                                {juryCard.criteria.map((criterion) => (
                                  <div className={styles.criterionRow} key={criterion.criterionId}>
                                    <span>{criterion.name}</span>
                                    <span>
                                      {criterion.value ?? '—'} / {criterion.maxScore}
                                    </span>
                                  </div>
                                ))}
                              </div>

                              <div className={styles.totalRow}>
                                <span>Итого</span>
                                <strong>{juryCard.total} / 10</strong>
                              </div>

                              {comment ? (
                                <div className={styles.commentSection}>
                                  <p
                                    className={`${styles.commentText} ${isCommentExpanded ? styles.commentTextExpanded : ''}`}
                                  >
                                    {comment}
                                  </p>
                                  <button
                                    className={styles.commentToggle}
                                    type="button"
                                    onClick={() => toggleComment(participant.id, juryCard.juryId)}
                                  >
                                    {isCommentExpanded ? 'Скрыть' : 'Подробнее'}
                                  </button>
                                </div>
                              ) : null}
                            </article>
                          )
                        })}
                      </div>
                    </details>
                  )
                })}
              </div>

              <div className={styles.actions}>
                <button
                  className={styles.backButton}
                  type="button"
                  onClick={() => navigate('/cabinet/events')}
                  aria-label="Назад к списку мероприятий"
                >
                  <span aria-hidden className={styles.backButtonArrow}>
                    ←
                  </span>
                </button>
                {view.contest.status === 'completed' ? (
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
                    disabled={!view.canComplete || organizerContestStore.isCompleting}
                    onClick={() => void handleCompleteContest()}
                  >
                    {organizerContestStore.isCompleting ? 'Завершение...' : 'Завершить конкурс'}
                  </button>
                )}
              </div>
              {!view.canComplete && view.contest.status !== 'completed' ? (
                <p className={styles.completeHint}>
                  Кнопка «Завершить конкурс» станет активна, когда все жюри отправят оценки.
                </p>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </section>
  )
})
