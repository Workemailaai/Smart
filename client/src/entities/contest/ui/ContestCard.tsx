import type { IContest } from '../model/contest.types'
import { resolveMediaUrl } from '@/shared'
import styles from './ContestCard.module.css'

type ContestCardProps = {
  contest: IContest
  variant?: 'pending' | 'results'
  withAlertStripe?: boolean
  /** Компактный список кабинета жюри на узком экране (≤430px, стили в CSS) */
  juryCabinetCompact?: boolean
  /** Список организатора: макет колонка дата / название / подпись, без обложки и таблицы */
  organizerLayout?: boolean
  /** Рядом с карандашом: красная зона удаления (раскрывается при hover по полоске) */
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
  const subtitle = contest.description?.trim() || 'Оценка конкурса'

  const organizerCardInner = (
    <>
      <div className={styles.cardOrganizerMain}>
        <p className={styles.dateOrganizer}>{formatDate(contest.updatedAt || contest.createdAt)}</p>
        <p className={styles.titleOrganizer}>{contest.title}</p>
        <p className={styles.subtitleOrganizer}>{subtitle}</p>
      </div>
      <div className={styles.actionCellOrganizer}>
        {variant === 'results' ? (
          withAlertStripe ? (
            <div className={styles.organizerActionsRow}>
              <button className={styles.resultsButton} type="button" onClick={() => onOpen?.()}>
                Результаты
              </button>
              <div className={styles.organizerDeleteWrap}>
                <button
                  className={styles.organizerDeleteStripe}
                  type="button"
                  aria-label="Удалить мероприятие"
                  onClick={(e) => {
                    e.stopPropagation()
                    void onDelete?.()
                  }}
                >
                  <svg className={styles.organizerDeleteX} width="24" height="24" viewBox="0 0 24 24" aria-hidden>
                    <path
                      d="M7 7L17 17M17 7L7 17"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>
            </div>
          ) : (
            <button className={styles.resultsButton} type="button" onClick={onOpen}>
              Результаты
            </button>
          )
        ) : (
          <div className={styles.organizerActionsRow}>
            <button className={styles.organizerEditBtn} type="button" onClick={onOpen} aria-label="Открыть мероприятие">
              <img alt="" className={styles.organizerEditIcon} src="/card-edit.svg" width={24} height={24} />
            </button>
            {withAlertStripe ? (
              <div className={styles.organizerDeleteWrap}>
                <button
                  className={styles.organizerDeleteStripe}
                  type="button"
                  aria-label="Удалить мероприятие"
                  onClick={(e) => {
                    e.stopPropagation()
                    void onDelete?.()
                  }}
                >
                  <svg className={styles.organizerDeleteX} width="24" height="24" viewBox="0 0 24 24" aria-hidden>
                    <path
                      d="M7 7L17 17M17 7L7 17"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </>
  )

  if (organizerLayout) {
    return (
      <article className={`${styles.card} ${styles.cardOrganizer}`}>
        {organizerCardInner}
      </article>
    )
  }

  const contestTypeTitle = contest.contestType || 'Не указан'

  const isClickableRow = Boolean(showVotedColumn && onOpen)
  const votedText = `${contest.submittedJuryCount ?? 0}/${contest.totalJuryCount ?? 0}`

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
