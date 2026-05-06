import type { ReactNode } from 'react'

export type OrganizerEventsWidgetTone = 'blue' | 'orange' | 'green'

export type OrganizerEventsWidgetProps = {
  title: string
  count: number
  tone: OrganizerEventsWidgetTone
  emptyText: string
  isLoading: boolean
  errorText: string | null
  hasItems: boolean
  filterSlot: ReactNode
  cardsSlot: ReactNode
}
