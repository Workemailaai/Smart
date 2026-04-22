import { observer } from 'mobx-react-lite'
import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import {
  downloadContestExportReport,
  getContestResultsView,
  type IContestResultsParticipant,
  type IContestResultsView,
} from '@/entities/contest'
import { userStore } from '@/entities/user'
import styles from './ContestResultsPage.module.css'

const MEDIA_BASE_URL = import.meta.env.VITE_MEDIA_BASE_URL || 'http://localhost:3000'
const SERVER_RESULTS_FALLBACK_BASE = import.meta.env.VITE_RESULTS_FALLBACK_BASE || '/media/results/default-cover'
const SERVER_RESULTS_FALLBACK_CANDIDATES = ['.jpg', '.jpeg', '.png', '.webp', '.svg'].map(
  (ext) => `${MEDIA_BASE_URL}${SERVER_RESULTS_FALLBACK_BASE}${ext}`,
)

function formatScore(score: number | null | undefined) {
  const safeScore = Number.isFinite(Number(score)) ? Number(score) : 0
  const normalized = Number(safeScore.toFixed(2))
  return String(normalized).replace('.', ',')
}

function formatContestDate(dateValue: string) {
  const parsedDate = new Date(dateValue)
  if (Number.isNaN(parsedDate.getTime())) {
    return 'Дата не указана'
  }
  const day = String(parsedDate.getDate()).padStart(2, '0')
  const month = String(parsedDate.getMonth() + 1).padStart(2, '0')
  const year = parsedDate.getFullYear()
  return `${day}.${month}.${year}`
}

function getInitials(fullName: string) {
  return fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

function resolveParticipantPhotoUrl(photoUrl: string | null) {
  if (!photoUrl) return null
  if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
    return photoUrl
  }
  const normalized = photoUrl.startsWith('/') ? photoUrl : `/${photoUrl}`
  return `${MEDIA_BASE_URL}${normalized}`
}

function resolveContestCoverUrl(coverImageUrl: string | null) {
  if (!coverImageUrl) return null
  if (coverImageUrl.startsWith('http://') || coverImageUrl.startsWith('https://')) {
    return coverImageUrl
  }
  const normalized = coverImageUrl.startsWith('/') ? coverImageUrl : `/${coverImageUrl}`
  return `${MEDIA_BASE_URL}${normalized}`
}

export const ContestResultsPage = observer(() => {
  const navigate = useNavigate()
  const { contestId } = useParams()
  const user = userStore.user
  const numericContestId = Number(contestId)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [view, setView] = useState<IContestResultsView | null>(null)
  const [backgroundImageUrl, setBackgroundImageUrl] = useState(SERVER_RESULTS_FALLBACK_CANDIDATES[0])

  useEffect(() => {
    if (!Number.isFinite(numericContestId)) return
    const load = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await getContestResultsView(numericContestId)
        setView(response.data)
      } catch (err) {
        setError((err as Error)?.message || 'Не удалось загрузить результаты конкурса')
      } finally {
        setIsLoading(false)
      }
    }
    void load()
  }, [numericContestId])

  const orderedTop = useMemo(() => {
    if (!view) return []
    const [first, second, third] = view.topThree
    return [second, first, third].filter(Boolean) as IContestResultsParticipant[]
  }, [view])

  useEffect(() => {
    const resolveFirstAvailableImage = async (candidates: string[]) => {
      for (const candidate of candidates) {
        const image = new Image()
        const loaded = await new Promise<boolean>((resolve) => {
          image.onload = () => resolve(true)
          image.onerror = () => resolve(false)
          image.src = candidate
        })
        if (loaded) return candidate
      }
      return null
    }

    let isCancelled = false

    const setBackground = async () => {
      const coverUrl = resolveContestCoverUrl(view?.contest.coverImageUrl ?? null)
      const candidates = coverUrl ? [coverUrl, ...SERVER_RESULTS_FALLBACK_CANDIDATES] : SERVER_RESULTS_FALLBACK_CANDIDATES
      const availableBackground = await resolveFirstAvailableImage(candidates)
      if (!isCancelled && availableBackground) {
        setBackgroundImageUrl(availableBackground)
      }
    }

    void setBackground()

    return () => {
      isCancelled = true
    }
  }, [view?.contest.coverImageUrl])

  if (!user) return <Navigate replace to="/" />
  if (user.role !== 'organizer' && user.role !== 'jury') return <Navigate replace to="/cabinet/events" />

  const contestDateText = view ? formatContestDate(view.contest.updatedAt || view.contest.createdAt) : ''

  const onExport = () => {
    if (!view || user?.role !== 'organizer') return
    void (async () => {
      setIsExporting(true)
      setError(null)
      try {
        const blob = await downloadContestExportReport(view.contest.id)
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = `contest-${view.contest.id}-report.xlsx`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(link.href)
      } catch (exportError) {
        setError((exportError as Error)?.message || 'Не удалось экспортировать отчет')
      } finally {
        setIsExporting(false)
      }
    })()
  }

  return (
    <section
      className={styles.page}
      style={{
        backgroundImage: `linear-gradient(0deg, rgba(10, 15, 21, 0.55) 0%, rgba(10, 15, 21, 0.55) 100%), url("${backgroundImageUrl}")`,
      }}
    >

      {user.role === 'jury' ? (
        <button className={styles.topBackButton} type="button" onClick={() => navigate('/cabinet/events')}>
          ←
        </button>
      ) : null}

      {isLoading ? <p className={styles.message}>Загрузка результатов...</p> : null}
      {error ? <p className={styles.error}>{error}</p> : null}

      {view ? (
        <div className={styles.panel}>
          {user.role === 'jury' ? (
            <div className={styles.mobileJuryTopSection}>
              <div className={styles.mobileJuryTopBar}>
                <button className={styles.mobileJuryBackButton} type="button" onClick={() => navigate('/cabinet/events')}>
                  <img src="/back-button.svg" alt="Назад" />
                </button>
                <div className={styles.mobileJuryContestMeta}>
                  <p className={styles.mobileJuryContestDate}>{contestDateText}</p>
                  <h1 className={styles.mobileJuryContestTitle}>{view.contest.title}</h1>
                  <p className={styles.mobileJuryContestSubtitle}>Оценка конкурса</p>
                </div>
              </div>

              <div className={styles.mobileJuryPodium}>
                {orderedTop.map((participant) => {
                  const isWinner = participant.place === 1
                  const photoUrl = resolveParticipantPhotoUrl(participant.photoUrl)
                  return (
                    <article key={`mobile-top-${participant.participantId}`} className={styles.mobileJuryPodiumCard}>
                      {isWinner ? (
                        <img className={styles.mobileJuryCrown} src="/crown-2.svg" alt="Победитель" />
                      ) : (
                        <div className={styles.mobileJuryPlaceBadge}>#{participant.place}</div>
                      )}
                      {photoUrl ? (
                        <img
                          className={isWinner ? styles.mobileJuryWinnerPhoto : styles.mobileJuryPodiumPhoto}
                          src={photoUrl}
                          alt={participant.fullName}
                        />
                      ) : (
                        <div className={isWinner ? styles.mobileJuryWinnerPhoto : styles.mobileJuryPodiumPhoto}>
                          {getInitials(participant.fullName)}
                        </div>
                      )}
                      <div className={styles.mobileJuryPodiumMeta}>
                        <p className={isWinner ? styles.mobileJuryWinnerName : styles.mobileJuryPodiumName}>
                          {participant.fullName}
                        </p>
                        <p className={styles.mobileJuryPodiumCountry}>{participant.country || 'Страна не указана'}</p>
                      </div>
                      <p className={styles.mobileJuryPodiumScore}>
                        <span className={styles.mobileJuryPodiumScoreCurrent}>{formatScore(participant.score)}</span>
                        <span className={styles.mobileJuryPodiumScoreDivider}>/</span>
                        <span className={styles.mobileJuryPodiumScoreMax}>10</span>
                      </p>
                    </article>
                  )
                })}
              </div>
            </div>
          ) : null}

          <div className={styles.podium}>
            {orderedTop.map((participant) => {
              const isWinner = participant.place === 1
              const photoUrl = resolveParticipantPhotoUrl(participant.photoUrl)
              return (
                <article key={participant.participantId} className={isWinner ? styles.winnerCard : styles.topCard}>
                  <div className={styles.placeBadge}>#{participant.place}</div>
                  {isWinner ? <img className={styles.crown} src="/crown-2.svg" alt="Победитель" /> : null}
                  {photoUrl ? (
                    <img
                      className={isWinner ? styles.winnerPhoto : styles.topPhoto}
                      src={photoUrl}
                      alt={participant.fullName}
                    />
                  ) : (
                    <div className={isWinner ? styles.winnerPhoto : styles.topPhoto}>{getInitials(participant.fullName)}</div>
                  )}
                  <div className={styles.topMeta}>
                    <p className={styles.topName}>{participant.fullName}</p>
                    <p className={styles.topCountry}>{participant.country || 'Страна не указана'}</p>
                  </div>
                  <p className={isWinner ? styles.winnerScore : styles.topScore}>{formatScore(participant.score)} / 10</p>
                </article>
              )
            })}
          </div>

          {user.role === 'jury' ? (
            <div className={styles.mobileJuryListSheet}>
              <div className={styles.mobileJuryListHandle} />
              <div className={styles.mobileJuryList}>
                {view.others.map((participant) => {
                  const photoUrl = resolveParticipantPhotoUrl(participant.photoUrl)
                  return (
                    <article className={styles.mobileJuryListItem} key={`mobile-row-${participant.participantId}`}>
                      <div className={styles.mobileJuryListMain}>
                        {photoUrl ? (
                          <img className={styles.mobileJuryListPhoto} src={photoUrl} alt={participant.fullName} />
                        ) : (
                          <div className={styles.mobileJuryListPhoto}>{getInitials(participant.fullName)}</div>
                        )}
                        <div className={styles.mobileJuryListMeta}>
                          <p className={styles.mobileJuryListName}>
                            {participant.fullName}
                            {participant.extraInfo ? `, ${participant.extraInfo}` : ''}
                          </p>
                          <p className={styles.mobileJuryListCountry}>{participant.country || 'Страна не указана'}</p>
                        </div>
                      </div>
                      <div className={styles.mobileJuryListBadges}>
                        <div className={styles.mobileJuryScoreBadge}>
                          <span className={styles.mobileJuryScoreCurrent}>{formatScore(participant.score)}</span>
                          <span className={styles.mobileJuryScoreDivider}>/</span>
                          <span className={styles.mobileJuryScoreMax}>10</span>
                        </div>
                        <div className={styles.mobileJuryPlaceValue}>{participant.place}</div>
                      </div>
                    </article>
                  )
                })}
              </div>
            </div>
          ) : null}

          <div className={styles.list}>
            {view.others.map((participant) => {
              const photoUrl = resolveParticipantPhotoUrl(participant.photoUrl)
              return (
                <article className={styles.listItem} key={participant.participantId}>
                  <span className={styles.listPlace}>#{participant.place}</span>
                  <div className={styles.listMain}>
                    {photoUrl ? (
                      <img className={styles.listPhoto} src={photoUrl} alt={participant.fullName} />
                    ) : (
                      <div className={styles.listPhoto}>{getInitials(participant.fullName)}</div>
                    )}
                    <div className={styles.listMeta}>
                      <p className={styles.listName}>
                        {participant.fullName}
                        {participant.extraInfo ? `, ${participant.extraInfo}` : ''}
                      </p>
                      <p className={styles.listCountry}>{participant.country || 'Страна не указана'}</p>
                    </div>
                  </div>
                  <div className={styles.listScore}>{formatScore(participant.score)} / 10</div>
                </article>
              )
            })}
          </div>

          <div className={styles.footer}>
            <button className={styles.backButton} type="button" onClick={() => navigate('/cabinet/events')}>
              ←
            </button>
            {user.role === 'organizer' ? (
              <button className={styles.exportButton} type="button" onClick={onExport} disabled={isExporting}>
                {isExporting ? 'Экспорт...' : 'Экспорт'}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  )
})
