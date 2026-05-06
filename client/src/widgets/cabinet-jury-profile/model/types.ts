export type JuryProfileWidgetProps = {
  fullName: string
  phoneMask: string
  roleTitle: string
  initials: string
  onLogout: () => void | Promise<void>
}
