import type { ITemplate } from '../model/template.types'
import styles from './TemplateCard.module.css'

const TYPE_LABELS: Record<string, string> = {
  creative: 'Творческий конкурс',
  sports: 'Спортивный конкурс',
  designers: 'Конкурс дизайнеров',
  rating_objects: 'Построение рейтинга объектов',
  student_work: 'Оценка студенческих работ',
  other: 'Другое',
  miss_world: 'Мисс мира',
  miss_universe: 'Мисс вселенная',
}

type TemplateCardProps = {
  template: ITemplate
  isDeleting?: boolean
  onDelete?: () => void
}

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

const getTemplateInitial = (templateName: string) => {
  const normalizedTemplateName = templateName.trim()
  return normalizedTemplateName ? normalizedTemplateName[0].toUpperCase() : 'Ш'
}

export function TemplateCard({ template, isDeleting = false, onDelete }: TemplateCardProps) {
  const typeLabel = template.contestType ? TYPE_LABELS[template.contestType] || template.contestType : null
  const templateCoverImageUrl = template.snapshot?.coverImageUrl ?? null
  const templateInitial = getTemplateInitial(template.name)

  return (
    <article className={styles.card}>
      <div className={styles.coverPlaceholder}>
        {templateCoverImageUrl ? (
          <img
            className={styles.coverImage}
            src={templateCoverImageUrl}
            alt={`Обложка шаблона ${template.name}`}
            loading="lazy"
          />
        ) : (
          <span className={styles.coverInitial} aria-hidden>
            {templateInitial}
          </span>
        )}
      </div>
      <p className={styles.date}>{formatDate(template.updatedAt || template.createdAt)}</p>
      <div className={styles.bottomRow}>
        <div>
          <p className={styles.name} title={template.name}>
            {template.name}
          </p>
          {typeLabel ? <p className={styles.typeLine}>{typeLabel}</p> : null}
        </div>
        {onDelete ? (
          <button
            className={styles.deleteButton}
            type="button"
            aria-label={`Удалить шаблон ${template.name}`}
            disabled={isDeleting}
            onClick={(event) => {
              event.stopPropagation()
              onDelete()
            }}
          />
        ) : null}
      </div>
    </article>
  )
}
