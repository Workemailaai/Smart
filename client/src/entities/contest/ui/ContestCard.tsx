import type { IContest } from '../model/contest.types'
import { resolveMediaUrl } from '@/shared'
import styles from './ContestCard.module.css'

const CONTEST_TYPE_LABELS: Record<string, string> = {
  creative: 'Творческий конкурс',
  sports: 'Спортивный конкурс',
  designers: 'Конкурс дизайнеров',
  rating_objects: 'Построение рейтинга объектов',
  student_work: 'Оценка студенческих работ',
  other: 'Другое',
}

type ContestCardProps = {
  contest: IContest
  variant?: 'pending' | 'results'
  withAlertStripe?: boolean
  /** Компактный список кабинета жюри на узком экране (≤430px, стили в CSS) */
  juryCabinetCompact?: boolean
  /** Список организатора: строка таблицы + удаление + клик по всей карточке */
  organizerLayout?: boolean
  onDelete?: () => void
  onOpen?: () => void
  /** Показывать колонку "Проголосовало" вместо колонки действий */
  showVotedColumn?: boolean
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
  organizerLayout = false,
  onDelete,
  onOpen,
  showVotedColumn = false,
}: ContestCardProps) {
  const coverUrl = resolveMediaUrl(contest.coverImageUrl)

  const contestTypeTitle = contest.contestType
    ? CONTEST_TYPE_LABELS[contest.contestType] || contest.contestType
    : 'Не указан'

  const isClickableRow = Boolean(showVotedColumn && onOpen)
  const votedText = `${contest.submittedJuryCount ?? 0}/${contest.totalJuryCount ?? 0}`

  if (organizerLayout) {
    return (
      <article
        aria-label={onOpen ? `Перейти к конкурсу «${contest.title}»` : undefined}
        className={`${styles.card} ${styles.cardWithVotes} ${styles.cardWithOrganizerActions} ${onOpen ? styles.cardClickable : ''}`}
        onClick={onOpen ? () => onOpen() : undefined}
        onKeyDown={
          onOpen
            ? (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onOpen()
                }
              }
            : undefined
        }
        role={onOpen ? 'button' : undefined}
        tabIndex={onOpen ? 0 : undefined}
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
        <p className={styles.votedCell}>{votedText}</p>
        <button
          className={styles.organizerDeleteButton}
          type="button"
          aria-label="Удалить мероприятие"
          onClick={(event) => {
            event.stopPropagation()
            void onDelete?.()
          }}
        />
      </article>
    )
  }

  return (
    <article
      aria-label={isClickableRow || (juryCabinetCompact && onOpen) ? `Перейти к конкурсу «${contest.title}»` : undefined}
      className={`${styles.card} ${juryCabinetCompact ? styles.juryCabinetCompact : ''} ${showVotedColumn ? styles.cardWithVotes : ''} ${isClickableRow ? styles.cardClickable : ''}`}
      onClick={isClickableRow || (juryCabinetCompact && onOpen) ? () => onOpen?.() : undefined}
      onKeyDown={
        isClickableRow || (juryCabinetCompact && onOpen)
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onOpen?.()
              }
            }
          : undefined
      }
      role={isClickableRow || (juryCabinetCompact && onOpen) ? 'button' : undefined}
      tabIndex={isClickableRow || (juryCabinetCompact && onOpen) ? 0 : undefined}
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

      {showVotedColumn ? (
        <p className={styles.votedCell}>{votedText}</p>
      ) : (
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
      )}
    </article>
  )
}
