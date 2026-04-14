import { observer } from 'mobx-react-lite'
import { useEffect } from 'react'
import { NavLink, Navigate, useNavigate, useParams } from 'react-router'
import { userStore } from '@/entities/user'
import { organizerContestStore } from '@/features/organizer-contest/model/organizerContestStore'
import styles from './OrganizerContestPage.module.css'

const MEDIA_BASE_URL = import.meta.env.VITE_MEDIA_BASE_URL || 'http://localhost:3000'

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

export const OrganizerContestPage = observer(() => {
  const navigate = useNavigate()
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
  const fullName = user.fullName || 'Пользователь'

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
              <div className={styles.avatar}>{getInitials(fullName)}</div>
            </div>
            <p className={styles.name}>{fullName}</p>
            <p className={styles.phone}>{user.phone}</p>
            <span className={styles.roleBadge}>Организатор</span>
          </div>

          <nav className={styles.menu}>
            <NavLink className={({ isActive }) => (isActive ? styles.activeItem : styles.menuItem)} to="/cabinet/events">
              Мероприятия
            </NavLink>
            <NavLink className={({ isActive }) => (isActive ? styles.activeItem : styles.menuItem)} to="/cabinet/constructor">
              Конструктор
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
          {organizerContestStore.isLoading ? <p className={styles.infoText}>Загрузка мероприятия...</p> : null}
          {organizerContestStore.error ? <p className={styles.errorText}>{organizerContestStore.error}</p> : null}

          {view ? (
            <>
              <article className={styles.contestCard}>
                <p className={styles.contestDate}>{formatDate(view.contest.createdAt)}</p>
                <p className={styles.contestTitle}>{view.contest.title}</p>
                <p className={styles.contestSubtitle}>{view.contest.description || 'Оценка конкурса'}</p>
                <p className={styles.progress}>
                  Сдали оценивание: {view.submittedJuryCount} / {view.totalJuryCount}
                </p>
              </article>

              <div className={styles.participantSections}>
                {view.participants.map((participant) => {
                  const participantPhoto = resolveMediaUrl(participant.photoUrl)
                  return (
                    <details className={styles.participantSection} key={participant.id}>
                      <summary className={styles.participantSummary}>
                        <div className={styles.participantMain}>
                          {participantPhoto ? (
                            <img className={styles.participantPhoto} src={participantPhoto} alt={participant.fullName} />
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
                        <strong className={styles.participantScore}>{participant.overallAverage} / 10</strong>
                      </summary>

                      <div className={styles.juryCards}>
                        {participant.juryCards.map((juryCard) => {
                          const juryPhoto = resolveMediaUrl(juryCard.photoUrl)
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
                                  <p className={styles.juryPhone}>{juryCard.phone}</p>
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
                            </article>
                          )
                        })}
                      </div>
                    </details>
                  )
                })}
              </div>

              <div className={styles.actions}>
                <button className={styles.backButton} type="button" onClick={() => navigate('/cabinet/events')}>
                  ←
                </button>
                <button
                  type="button"
                  className={styles.primaryButton}
                  disabled={!view.canComplete || organizerContestStore.isCompleting}
                  onClick={() => void organizerContestStore.complete(numericContestId)}
                >
                  {organizerContestStore.isCompleting ? 'Завершение...' : 'Завершить конкурс'}
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </section>
  )
})
