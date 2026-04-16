import { observer } from 'mobx-react-lite'
import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import { getContestResultsView, type IContestResultsParticipant, type IContestResultsView } from '@/entities/contest'
import { userStore } from '@/entities/user'
import styles from './ContestResultsPage.module.css'

const MEDIA_BASE_URL = import.meta.env.VITE_MEDIA_BASE_URL || 'http://localhost:3000'
const SERVER_RESULTS_FALLBACK_BASE = import.meta.env.VITE_RESULTS_FALLBACK_BASE || '/media/results/default-cover'
const SERVER_RESULTS_FALLBACK_CANDIDATES = ['.jpg', '.jpeg', '.png', '.webp', '.svg'].map(
  (ext) => `${MEDIA_BASE_URL}${SERVER_RESULTS_FALLBACK_BASE}${ext}`,
)

function formatScore(score: number) {
  const normalized = Number(score.toFixed(2))
  return String(normalized).replace('.', ',')
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

  const rows = view ? [...view.topThree, ...view.others] : []

  const onExport = () => {
    if (!view) return
    const csvRows = [
      ['Место', 'Участник', 'Возраст', 'Страна', 'Средний балл'],
      ...rows.map((item) => [
        String(item.place),
        item.fullName,
        String(item.age),
        item.country || '',
        String(item.score),
      ]),
    ]
    const content = csvRows.map((line) => line.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(';')).join('\n')
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `contest-results-${view.contest.id}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(link.href)
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
          <div className={styles.podium}>
            {orderedTop.map((participant) => {
              const isWinner = participant.place === 1
              const photoUrl = resolveParticipantPhotoUrl(participant.photoUrl)
              return (
                <article key={participant.participantId} className={isWinner ? styles.winnerCard : styles.topCard}>
                  <div className={styles.placeBadge}>#{participant.place}</div>
                  {isWinner ? <div className={styles.crown}>★</div> : null}
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
                        {participant.fullName}, {participant.age}
                      </p>
                      <p className={styles.listCountry}>{participant.country || 'Страна не указана'}</p>
                    </div>
                  </div>
                  <div className={styles.listScore}>{formatScore(participant.score)} / 10</div>
                </article>
              )
            })}
          </div>

          {user.role === 'organizer' ? (
            <div className={styles.footer}>
              <button className={styles.backButton} type="button" onClick={() => navigate('/cabinet/events')}>
                ←
              </button>
              <button className={styles.exportButton} type="button" onClick={onExport}>
                Экспорт
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  )
})
