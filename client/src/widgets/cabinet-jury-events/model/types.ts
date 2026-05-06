import type { ReactNode } from 'react'

export type JuryEventsWidgetTone = 'blue' | 'orange' | 'green'

export type JuryEventsWidgetProps = {
  title: string
  count: number
  tone: JuryEventsWidgetTone
  emptyText: string
  isLoading: boolean
  errorText: string | null
  hasItems: boolean
  filterSlot: ReactNode
  cardsSlot: ReactNode
}
