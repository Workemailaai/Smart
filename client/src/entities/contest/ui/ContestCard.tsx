import type { IContest } from '../model/contest.types'
import styles from './ContestCard.module.css'

type ContestCardProps = {
  contest: IContest
  actionLabel?: string
}

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

export function ContestCard({ contest, actionLabel }: ContestCardProps) {
  return (
    <article className={styles.card}>
      <div>
        <p className={styles.date}>{formatDate(contest.updatedAt || contest.createdAt)}</p>
        <p className={styles.title}>{contest.title}</p>
        <p className={styles.subtitle}>{contest.description || 'Оценка конкурса'}</p>
      </div>
      {actionLabel ? (
        <button className={styles.actionText} type="button">
          {actionLabel}
        </button>
      ) : (
        <button className={styles.actionCircle} type="button">
          →
        </button>
      )}
    </article>
  )
}
