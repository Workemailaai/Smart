import { observer } from 'mobx-react-lite'
import { useEffect } from 'react'
import { Link, Navigate, useParams } from 'react-router'
import { userStore } from '@/entities/user'
import { organizerContestStore } from '@/features/organizer-contest/model/organizerContestStore'
import styles from './OrganizerContestPage.module.css'

export const OrganizerContestPage = observer(() => {
  const user = userStore.user
  const { contestId } = useParams()
  const numericContestId = Number(contestId)

  useEffect(() => {
    if (Number.isFinite(numericContestId)) {
      void organizerContestStore.loadContest(numericContestId)
    }
    return () => organizerContestStore.reset()
  }, [numericContestId])

  if (!user) return <Navigate replace to="/" />
  if (user.role !== 'organizer') return <Navigate replace to="/cabinet/events" />

  const view = organizerContestStore.view

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Мероприятия</h1>
        <Link className={styles.backButton} to="/cabinet/events">
          Назад к списку
        </Link>
      </header>

      {organizerContestStore.isLoading ? <p className={styles.infoText}>Загрузка мероприятия...</p> : null}
      {organizerContestStore.error ? <p className={styles.errorText}>{organizerContestStore.error}</p> : null}

      {view ? (
        <div className={styles.content}>
          <article className={styles.contestCard}>
            <p className={styles.contestTitle}>{view.contest.title}</p>
            <p className={styles.contestSubtitle}>{view.contest.description || 'Оценка конкурса'}</p>
            <p className={styles.progress}>
              Сдали оценивание: {view.submittedJuryCount} / {view.totalJuryCount}
            </p>
          </article>

          <div className={styles.participantSections}>
            {view.participants.map((participant) => (
              <details className={styles.participantSection} key={participant.id}>
                <summary className={styles.participantSummary}>
                  <span>
                    {participant.fullName}, {participant.age}
                  </span>
                  <strong>{participant.overallAverage} / 10</strong>
                </summary>

                <div className={styles.juryCards}>
                  {participant.juryCards.map((juryCard) => (
                    <article className={styles.juryCard} key={juryCard.juryId}>
                      <p className={styles.juryName}>{juryCard.fullName}</p>
                      <p className={styles.juryPhone}>{juryCard.phone}</p>
                      {juryCard.criteria.map((criterion) => (
                        <div className={styles.criterionRow} key={criterion.criterionId}>
                          <span>{criterion.name}</span>
                          <span>
                            {criterion.value ?? '—'} / {criterion.maxScore}
                          </span>
                        </div>
                      ))}
                      <div className={styles.totalRow}>
                        <span>Итого</span>
                        <strong>{juryCard.total} / 10</strong>
                      </div>
                    </article>
                  ))}
                </div>
              </details>
            ))}
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.primaryButton}
              disabled={!view.canComplete || organizerContestStore.isCompleting}
              onClick={() => void organizerContestStore.complete(numericContestId)}
            >
              {organizerContestStore.isCompleting ? 'Завершение...' : 'Завершить конкурс'}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  )
})
