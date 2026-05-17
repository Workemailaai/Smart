import styles from './ConfirmDialog.module.css'

type ConfirmDialogProps = {
  title: string
  subtitle?: string
  acceptLabel: string
  stayLabel: string
  onAccept: () => void
  onStay: () => void
  isAcceptDisabled?: boolean
  isStayDisabled?: boolean
}

/** Модальное подтверждение в стиле priorityConfirm */
export function ConfirmDialog({
  title,
  subtitle,
  acceptLabel,
  stayLabel,
  onAccept,
  onStay,
  isAcceptDisabled = false,
  isStayDisabled = false,
}: ConfirmDialogProps) {
  return (
    <div className={styles.overlay} onClick={onStay} role="presentation">
      <div className={styles.modal} onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
        <div className={styles.body}>
          <div className={styles.textGroup}>
            <div className={styles.title}>{title}</div>
            {subtitle ? <div className={styles.subtitle}>{subtitle}</div> : null}
          </div>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.acceptButton}
              disabled={isAcceptDisabled}
              onClick={onAccept}
            >
              {acceptLabel}
            </button>
            <button type="button" className={styles.stayButton} disabled={isStayDisabled} onClick={onStay}>
              {stayLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
