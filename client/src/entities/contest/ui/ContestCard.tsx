import type { IContest } from '../model/contest.types'
import { resolveMediaUrl } from '@/shared'
import styles from './ContestCard.module.css'

type ContestCardProps = {
  contest: IContest
  variant?: 'pending' | 'results'
  withAlertStripe?: boolean
  /** Компактный список кабинета жюри на узком экране (≤430px, стили в CSS) */
  juryCabinetCompact?: boolean
  onOpen?: () => void
}

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

export function ContestCard({
  contest,
  variant = 'pending',
  withAlertStripe = false,
  juryCabinetCompact = false,
  onOpen,
}: ContestCardProps) {
  const contestTypeTitle = contest.contestType || 'Не указан'
  const coverUrl = resolveMediaUrl(contest.coverImageUrl)

  return (
    <article
      aria-label={juryCabinetCompact && onOpen ? `Перейти к конкурсу «${contest.title}»` : undefined}
      className={`${styles.card} ${juryCabinetCompact ? styles.juryCabinetCompact : ''}`}
      onClick={juryCabinetCompact && onOpen ? () => onOpen() : undefined}
      onKeyDown={
        juryCabinetCompact && onOpen
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onOpen()
              }
            }
          : undefined
      }
      role={juryCabinetCompact && onOpen ? 'button' : undefined}
      tabIndex={juryCabinetCompact && onOpen ? 0 : undefined}
    >
      <div className={styles.coverCell}>
        {coverUrl ? (
          <img className={styles.coverImage} src={coverUrl} alt={`Обложка конкурса ${contest.title}`} />
        ) : (
          <span className={styles.coverPlaceholder}>—</span>
        )}
      </div>

      <p className={styles.title}>{contest.title}</p>
      <p className={styles.date}>{formatDate(contest.updatedAt || contest.createdAt)}</p>
      <p className={styles.type}>{contestTypeTitle}</p>

      <div className={styles.actionCell}>
        {variant === 'results' ? (
          <button className={styles.resultsButton} type="button" onClick={onOpen}>
            Результаты
          </button>
        ) : (
          <div className={styles.pendingAction}>
            <button className={styles.actionCircle} type="button" onClick={onOpen}>
              →
            </button>
            {withAlertStripe ? <span className={styles.alertStripe} /> : null}
          </div>
        )}
      </div>
    </article>
  )
}
