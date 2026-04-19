import { NavLink } from 'react-router'
import styles from '@/pages/cabinet-page/CabinetPage.module.css'

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

type OrganizerCabinetSidebarProps = {
  fullName: string
  phone: string
  onLogout: () => void | Promise<void>
}

/** Единый сайдбар организатора (иконки, активное состояние) — как в кабинете */
export function OrganizerCabinetSidebar({ fullName, phone, onLogout }: OrganizerCabinetSidebarProps) {
  return (
    <aside className={styles.sidebar}>
      <div>
        <div className={styles.sidebarHeader}>
          <h1 className={styles.brand}>СмартОценка</h1>
        </div>
        <div className={styles.profileCard}>
          <div className={styles.avatarWrap}>
            <div className={styles.avatar}>{getInitials(fullName)}</div>
          </div>
          <p className={styles.name}>{fullName}</p>
          <p className={styles.phone}>{phone}</p>
          <span className={styles.roleBadge}>Организатор</span>
        </div>

        <nav className={styles.menu}>
          <NavLink className={({ isActive }) => (isActive ? styles.activeItem : styles.menuItem)} to="/cabinet/events">
            <span aria-hidden className={`${styles.navIcon} ${styles.navIconEvents}`} />
            <span className={styles.menuLabel}>Мероприятия</span>
          </NavLink>
          <NavLink
            className={({ isActive }) => (isActive ? styles.activeItem : styles.menuItem)}
            to="/cabinet/constructor"
          >
            <span aria-hidden className={`${styles.navIcon} ${styles.navIconConstructor}`} />
            <span className={styles.menuLabel}>Конструктор</span>
          </NavLink>
          <NavLink className={({ isActive }) => (isActive ? styles.activeItem : styles.menuItem)} to="/cabinet/settings">
            <span aria-hidden className={`${styles.navIcon} ${styles.navIconSettings}`} />
            <span className={styles.menuLabel}>Настройки</span>
          </NavLink>
          <NavLink className={({ isActive }) => (isActive ? styles.activeItem : styles.menuItem)} to="/cabinet/info">
            <span aria-hidden className={`${styles.navIcon} ${styles.navIconInfo}`} />
            <span className={styles.menuLabel}>Информация</span>
          </NavLink>
        </nav>
      </div>

      <div className={styles.sidebarFooter}>
        <button className={styles.logoutButton} onClick={() => void onLogout()} type="button">
          <span aria-hidden className={styles.logoutIcon} />
          <span>Выход</span>
        </button>
        <p className={styles.versionText}>v 1.0.0{'\n'}© 2026 СмартОценка</p>
      </div>
    </aside>
  )
}
