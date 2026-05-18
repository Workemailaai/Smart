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
  onEdit?: () => void
  onDelete?: () => void
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
  organizerLayout = false,
  onEdit,
  onDelete,
  onOpen,
}: ContestCardProps) {
  const coverUrl = resolveMediaUrl(contest.coverImageUrl)

  const contestTypeTitle = contest.contestType
    ? CONTEST_TYPE_LABELS[contest.contestType] || contest.contestType
    : 'Не указан'

  const isClickableRow = Boolean(onOpen)
  const votedText = `${contest.submittedJuryCount ?? 0}/${contest.totalJuryCount ?? 0}`
  const submittedJuryCount = contest.submittedJuryCount ?? 0
  const totalJuryCount = contest.totalJuryCount ?? 0
  const isAllJurySubmitted = totalJuryCount > 0 && submittedJuryCount >= totalJuryCount

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
        <div
          className={`${styles.organizerVotedCell} ${isAllJurySubmitted ? styles.organizerVotedCellComplete : ''}`}
          aria-label={`Проголосовало ${votedText}`}
        >
          <span className={styles.organizerVotedCurrent}>{submittedJuryCount}</span>
          <span className={styles.organizerVotedDivider}>/</span>
          <span className={styles.organizerVotedTotal}>{totalJuryCount}</span>
        </div>
        <div className={styles.organizerActionsCell}>
          {onEdit ? (
            <button
              className={styles.organizerEditButton}
              type="button"
              aria-label="Редактировать состав мероприятия"
              onClick={(event) => {
                event.stopPropagation()
                onEdit()
              }}
            />
          ) : null}
          <button
            className={`${styles.organizerDeleteButton} ${isAllJurySubmitted ? styles.organizerDeleteButtonComplete : ''}`}
            type="button"
            aria-label="Удалить мероприятие"
            onClick={(event) => {
              event.stopPropagation()
              void onDelete?.()
            }}
          />
        </div>
      </article>
    )
  }

  if (juryCabinetCompact) {
    return (
      <article
        aria-label={onOpen ? `Перейти к конкурсу «${contest.title}»` : undefined}
        className={`${styles.card} ${styles.juryCabinetCompact} ${onOpen ? styles.cardClickable : ''}`}
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
        <div className={styles.juryCompactHeader}>
          <div className={styles.coverCell}>
            {coverUrl ? (
              <img className={styles.coverImage} src={coverUrl} alt={`Обложка конкурса ${contest.title}`} />
            ) : (
              <span className={styles.coverPlaceholder}>—</span>
            )}
          </div>
          <p className={styles.title}>{contest.title}</p>
        </div>

        <div className={styles.juryCompactMeta}>
          <p className={styles.date}>{formatDate(contest.updatedAt || contest.createdAt)}</p>
          <p className={styles.type}>{contestTypeTitle}</p>
        </div>
      </article>
    )
  }

  return (
    <article
      aria-label={isClickableRow || (juryCabinetCompact && onOpen) ? `Перейти к конкурсу «${contest.title}»` : undefined}
      className={`${styles.card} ${juryCabinetCompact ? styles.juryCabinetCompact : ''} ${isClickableRow ? styles.cardClickable : ''}`}
      onClick={isClickableRow ? () => onOpen?.() : undefined}
      onKeyDown={
        isClickableRow
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onOpen?.()
              }
            }
          : undefined
      }
      role={isClickableRow ? 'button' : undefined}
      tabIndex={isClickableRow ? 0 : undefined}
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
