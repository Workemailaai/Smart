import type { MutableRefObject, PointerEvent } from 'react'
import type { juryContestStore } from '@/features/jury-contest/model/juryContestStore'

export type ScoreSliderPointerState = {
  pointerId: number | null
  startX: number
  startY: number
  isHorizontalSwipeLocked: boolean
  isVerticalScrollLocked: boolean
}

export type JuryMobileContestSheetProps = {
  juryContestStore: typeof juryContestStore
  commentLimit: number
  horizontalSwipeThresholdPx: number
  isOpen: boolean
  isPriorityStepVisible: boolean
  isScoringStepVisible: boolean
  isScoreEditingLocked: boolean
  isCompletedContest: boolean
  canStartRevote: boolean
  isMobilePriorityConfirmOpen: boolean
  isMobileLeaveConfirmOpen: boolean
  touchDragFrom: number | null
  touchDragOver: number | null
  prioritySheetContentReference: MutableRefObject<HTMLDivElement | null>
  prioritySaveButtonReference: MutableRefObject<HTMLButtonElement | null>
  pendingScoreUpdateReference: MutableRefObject<{ participantId: number; criterionId: number; value: number } | null>
  scoreSliderPointerStateReference: MutableRefObject<ScoreSliderPointerState>
  onRequestClose: () => void
  onPriorityContinue: () => Promise<void>
  onOpenPriorityConfirm: () => void
  onClosePriorityConfirm: () => void
  onCloseLeaveConfirm: () => void
  onPriorityDragStart: (nextIndex: number, pointerId: number, element: HTMLDivElement) => void
  onPriorityDragMove: (event: PointerEvent<HTMLDivElement>) => void
  onPriorityDragEnd: (pointerId: number) => void
  onPriorityDragCancel: (pointerId: number) => void
  getScoreByPointerPosition: (params: { clientX: number; trackElement: HTMLDivElement; min: number; max: number }) => number
  scheduleDebouncedScoreUpdate: (params: { participantId: number; criterionId: number; value: number }) => void
  flushDebouncedScoreUpdate: () => void
  onStartRevote: () => Promise<void>
  onSubmitScores: () => Promise<void>
  onOpenResults: () => void
  onCloseSheetWithConfirm: () => void
  getInitials: (name: string) => string
  formatDate: (value: string) => string
}
