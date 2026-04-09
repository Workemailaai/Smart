import type { ITemplate } from '../model/template.types'
import styles from './TemplateCard.module.css'

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
  return (
    <article className={styles.card}>
      <p className={styles.date}>{formatDate(template.updatedAt || template.createdAt)}</p>
      <p className={styles.name}>{template.name}</p>
    </article>
  )
}
