import { observer } from 'mobx-react-lite'
import { useEffect } from 'react'
import { NavLink, Navigate, useNavigate, useParams } from 'react-router'
import { userStore } from '@/entities/user'
import { juryContestStore } from '@/features/jury-contest/model/juryContestStore'
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

  if (!user) return <Navigate replace to="/" />
  if (user.role !== 'jury') return <Navigate replace to="/cabinet/events" />

  const view = juryContestStore.view
  const userName = user.fullName || 'Пользователь'

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
              <div className={styles.avatar}>{getInitials(userName)}</div>
            </div>
            <p className={styles.name}>{userName}</p>
            <p className={styles.phone}>{user.phone}</p>
            <span className={styles.roleBadge}>Жюри</span>
          </div>

          <nav className={styles.menu}>
            <NavLink className={({ isActive }) => (isActive ? styles.activeItem : styles.menuItem)} to="/cabinet/events">
              Мероприятия
            </NavLink>
            <NavLink className={({ isActive }) => (isActive ? styles.activeItem : styles.menuItem)} to="/cabinet/settings">
              Настройки
            </NavLink>
            <NavLink className={({ isActive }) => (isActive ? styles.activeItem : styles.menuItem)} to="/cabinet/info">
              Информация
            </NavLink>
          </nav>
        </div>

        <div className={styles.sidebarFooter}>
          <button className={styles.logoutButton} onClick={() => void onLogout()} type="button">
            Выход
          </button>
          <p className={styles.versionText}>v 1.0.0{'\n'}© 2026 СмартОценка</p>
        </div>
      </aside>

      <div className={styles.content}>
        <header className={styles.topBar}>
          <h2 className={styles.topTitle}>Мероприятия</h2>
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

        <div className={styles.main}>
          <h3 className={styles.pageHeading}>Оцените участников</h3>

          {juryContestStore.isLoading ? <p className={styles.infoText}>Загрузка мероприятия...</p> : null}
          {juryContestStore.error ? <p className={styles.errorText}>{juryContestStore.error}</p> : null}

          {view ? (
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
                              {participant.fullName}, {participant.age}
                            </span>
                            <span className={styles.participantCountry}>{participant.country || 'Страна не указана'}</span>
                          </div>
                        </div>
                        <strong className={styles.averageBadge}>{juryContestStore.getParticipantAverage(participant.id)} / 10</strong>
                      </summary>

                      <div className={styles.criteriaWrap}>
                        {view.criteria.map((criterion) => {
                          const value = juryContestStore.getScore(participant.id, criterion.id)
                          const percent = criterion.maxScore > 0 ? (value / criterion.maxScore) * 100 : 0
                          return (
                            <label className={styles.criterionRow} key={criterion.id}>
                              <div className={styles.criterionLabel}>{criterion.name}</div>
                              <div className={styles.sliderWrap}>
                                <span className={styles.boundaryValue}>0</span>
                                <div className={styles.sliderTrackWrap}>
                                  <div className={styles.sliderTrack}>
                                    <div className={styles.sliderProgress} style={{ width: `${percent}%` }} />
                                  </div>
                                  <input
                                    className={styles.sliderInput}
                                    type="range"
                                    min={0}
                                    max={criterion.maxScore}
                                    step={1}
                                    value={value}
                                    onChange={(event) =>
                                      juryContestStore.setScore(participant.id, criterion.id, Number(event.target.value))
                                    }
                                  />
                                  <span className={styles.sliderValue} style={{ left: `calc(${percent}% - 24px)` }}>
                                    {value}
                                  </span>
                                </div>
                                <span className={styles.boundaryValue}>{criterion.maxScore}</span>
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
            </>
          ) : null}
        </div>
      </div>
    </section>
  )
})
