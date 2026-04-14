import type { IContest } from '../model/contest.types'
import styles from './ContestCard.module.css'

type ContestCardProps = {
  contest: IContest
  variant?: 'pending' | 'results'
  withAlertStripe?: boolean
  onOpen?: () => void
}

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

export function ContestCard({ contest, variant = 'pending', withAlertStripe = false, onOpen }: ContestCardProps) {
  return (
    <article className={styles.card}>
      <div className={styles.content}>
        <p className={styles.date}>{formatDate(contest.updatedAt || contest.createdAt)}</p>
        <p className={styles.title}>{contest.title}</p>
        <p className={styles.subtitle}>{contest.description || 'Оценка конкурса'}</p>
      </div>
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
    </article>
  )
}
