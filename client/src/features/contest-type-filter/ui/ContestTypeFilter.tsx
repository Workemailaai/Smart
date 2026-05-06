import type { ContestTypeFilterProps } from '../model/types'
import styles from './ContestTypeFilter.module.css'

export function ContestTypeFilter(props: ContestTypeFilterProps) {
  const { options, selectedType, selectedTitle, isOpen, onToggle, onSelect } = props

  return (
    <div className={styles.container}>
      <button className={styles.button} type="button" onClick={onToggle}>
        <span>{selectedTitle}</span>
        <span aria-hidden className={styles.chevron} />
      </button>
      {isOpen ? (
        <div className={styles.dropdown}>
          {options.map((option) => (
            <button
              key={option.id}
              className={`${styles.option} ${selectedType === option.id ? styles.activeOption : ''}`}
              type="button"
              onClick={() => onSelect(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
