import { NavLink } from 'react-router'
import styles from './JuryBottomNav.module.css'

export function JuryBottomNav() {
  return (
    <nav className={styles.juryBottomNav} aria-label="Основные разделы кабинета жюри">
      <div className={styles.juryBottomNavInner}>
        <NavLink
          className={({ isActive }) => `${styles.juryBottomNavLink} ${isActive ? styles.juryBottomNavLinkActive : ''}`}
          to="/cabinet/profile"
          aria-label="Профиль"
        >
          <span className={`${styles.juryBottomNavIcon} ${styles.juryBottomNavIconProfile}`} aria-hidden />
        </NavLink>
        <NavLink
          className={({ isActive }) => `${styles.juryBottomNavLink} ${isActive ? styles.juryBottomNavLinkActive : ''}`}
          to="/cabinet/events"
          aria-label="Мероприятия"
        >
          <span className={`${styles.juryBottomNavIcon} ${styles.juryBottomNavIconEvents}`} aria-hidden />
        </NavLink>
        <span className={`${styles.juryBottomNavLink} ${styles.juryBottomNavLinkDisabled}`} aria-label="Настройки">
          <span className={`${styles.juryBottomNavIcon} ${styles.juryBottomNavIconSettings}`} aria-hidden />
        </span>
        <span className={`${styles.juryBottomNavLink} ${styles.juryBottomNavLinkDisabled}`} aria-label="Информация">
          <span className={`${styles.juryBottomNavIcon} ${styles.juryBottomNavIconInfo}`} aria-hidden />
        </span>
      </div>
    </nav>
  )
}
