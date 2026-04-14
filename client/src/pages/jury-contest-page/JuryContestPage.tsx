import { observer } from 'mobx-react-lite'
import { useEffect } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import { userStore } from '@/entities/user'
import { juryContestStore } from '@/features/jury-contest/model/juryContestStore'
import styles from './JuryContestPage.module.css'

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

  if (!user) return <Navigate replace to="/" />
  if (user.role !== 'jury') return <Navigate replace to="/cabinet/events" />

  const view = juryContestStore.view

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Мероприятия</h1>
        <div className={styles.headerActions}>
          <Link className={styles.backButton} to="/cabinet/events">
            Назад к списку
          </Link>
        </div>
      </header>

      {juryContestStore.isLoading ? <p className={styles.infoText}>Загрузка мероприятия...</p> : null}
      {juryContestStore.error ? <p className={styles.errorText}>{juryContestStore.error}</p> : null}

      {view ? (
        <div className={styles.content}>
          <article className={styles.contestCard}>
            <p className={styles.contestTitle}>{view.contest.title}</p>
            <p className={styles.contestSubtitle}>{view.contest.description || 'Оценка конкурса'}</p>
          </article>

          <div className={styles.participantList}>
            {view.participants.map((participant) => (
              <details className={styles.participantSection} key={participant.id}>
                <summary className={styles.participantSummary}>
                  <span>
                    {participant.fullName}, {participant.age}
                  </span>
                  <strong>{juryContestStore.getParticipantAverage(participant.id)} / 10</strong>
                </summary>

                <div className={styles.criteriaWrap}>
                  {view.criteria.map((criterion) => {
                    const value = juryContestStore.getScore(participant.id, criterion.id)
                    return (
                      <label className={styles.criterionRow} key={criterion.id}>
                        <div className={styles.criterionHeader}>
                          <span>{criterion.name}</span>
                          <span>
                            {value} / {criterion.maxScore}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={criterion.maxScore}
                          step={1}
                          value={value}
                          onChange={(event) =>
                            juryContestStore.setScore(
                              participant.id,
                              criterion.id,
                              Number(event.target.value),
                            )
                          }
                        />
                      </label>
                    )
                  })}
                </div>
              </details>
            ))}
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.secondaryButton}
              disabled={juryContestStore.isSaving}
              onClick={() => void juryContestStore.save(numericContestId)}
            >
              {juryContestStore.isSaving ? 'Сохранение...' : 'Сохранить'}
            </button>
            <button
              type="button"
              className={styles.primaryButton}
              disabled={juryContestStore.isSubmitting || view.mySubmitted}
              onClick={() => void juryContestStore.submit(numericContestId)}
            >
              {view.mySubmitted
                ? 'Оценки уже отправлены'
                : juryContestStore.isSubmitting
                  ? 'Отправка...'
                  : 'Отправить оценивание'}
            </button>
          </div>
        </div>
      ) : null}

      <button className={styles.floatBack} type="button" onClick={() => navigate('/cabinet/events')}>
        ←
      </button>
    </section>
  )
})
