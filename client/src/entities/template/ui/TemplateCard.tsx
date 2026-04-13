import type { ITemplate } from '../model/template.types'
import styles from './TemplateCard.module.css'

const TYPE_LABELS: Record<string, string> = {
  miss_world: 'Мисс мира',
  miss_universe: 'Мисс вселенная',
}

type TemplateCardProps = {
  template: ITemplate
}

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

export function TemplateCard({ template }: TemplateCardProps) {
  const typeLabel = template.contestType ? TYPE_LABELS[template.contestType] || template.contestType : null
  return (
    <article className={styles.card}>
      <p className={styles.date}>{formatDate(template.updatedAt || template.createdAt)}</p>
      <p className={styles.name}>{template.name}</p>
      {typeLabel ? <p className={styles.typeLine}>{typeLabel}</p> : null}
    </article>
  )
}
