import localStyles from './JuryProfileWidget.module.css'
import type { JuryProfileWidgetProps } from '../model/types'

export function JuryProfileWidget(props: JuryProfileWidgetProps) {
  const { fullName, phoneMask, roleTitle, initials, onLogout } = props

  return (
    <div className={localStyles.panel} data-jury-profile-root>
      <div className={localStyles.row}>
        <button
          className={localStyles.sideButton}
          type="button"
          onClick={() => void onLogout()}
          aria-label="Выйти из аккаунта"
        >
          <span className={localStyles.sideButtonIcon} aria-hidden>
            <img src="/exit/logout.svg" alt="" width={18} height={18} />
          </span>
        </button>
        <div className={localStyles.center}>
          <div className={localStyles.avatarRing}>
            <div className={localStyles.avatar}>{initials}</div>
          </div>
          <div className={localStyles.textBlock}>
            <p className={localStyles.name}>{fullName}</p>
            <p className={localStyles.phone}>{phoneMask}</p>
          </div>
          <span className={localStyles.badge}>{roleTitle}</span>
        </div>
        <button className={localStyles.sideButton} type="button" aria-label="Раздел в разработке" disabled>
          <span className={localStyles.sideButtonIcon} aria-hidden>
            <img src="/card-edit.svg" alt="" width={18} height={18} />
          </span>
        </button>
      </div>
    </div>
  )
}
