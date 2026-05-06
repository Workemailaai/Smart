import { useEffect, useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import type { SetURLSearchParams } from 'react-router'
import { juryContestStore } from '@/features/jury-contest/model/juryContestStore'
import type { ScoreSliderPointerState } from './types'

type UseJuryMobileContestSheetParams = {
  searchParams: URLSearchParams
  setSearchParams: SetURLSearchParams
  shouldWarnOnMobileModalClose: boolean
  scoreUpdateDebounceMs: number
}

export function useJuryMobileContestSheet(params: UseJuryMobileContestSheetParams) {
  const { searchParams, setSearchParams, shouldWarnOnMobileModalClose, scoreUpdateDebounceMs } = params
  const [touchDragFrom, setTouchDragFrom] = useState<number | null>(null)
  const [touchDragOver, setTouchDragOver] = useState<number | null>(null)
  const [isMobilePriorityConfirmOpen, setIsMobilePriorityConfirmOpen] = useState(false)
  const [isMobileLeaveConfirmOpen, setIsMobileLeaveConfirmOpen] = useState(false)
  const touchPointerIdReference = useRef<number | null>(null)
  const scoreUpdateTimeoutIdReference = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingScoreUpdateReference = useRef<{ participantId: number; criterionId: number; value: number } | null>(null)
  const scoreSliderPointerStateReference = useRef<ScoreSliderPointerState>({
    pointerId: null,
    startX: 0,
    startY: 0,
    isHorizontalSwipeLocked: false,
    isVerticalScrollLocked: false,
  })

  useEffect(() => {
    return () => {
      if (scoreUpdateTimeoutIdReference.current !== null) {
        clearTimeout(scoreUpdateTimeoutIdReference.current)
      }
    }
  }, [])

  const closeModal = () => {
    const nextSearchParams = new URLSearchParams(searchParams)
    nextSearchParams.delete('juryContestId')
    setSearchParams(nextSearchParams, { replace: true })
    setTouchDragFrom(null)
    setTouchDragOver(null)
    setIsMobilePriorityConfirmOpen(false)
    setIsMobileLeaveConfirmOpen(false)
    juryContestStore.reset()
  }

  const requestCloseModal = () => {
    if (shouldWarnOnMobileModalClose) {
      setIsMobileLeaveConfirmOpen(true)
      return
    }
    closeModal()
  }

  const getScoreByPointerPosition = (paramsForScore: {
    clientX: number
    trackElement: HTMLDivElement
    min: number
    max: number
  }) => {
    const { clientX, trackElement, min, max } = paramsForScore
    const trackRect = trackElement.getBoundingClientRect()
    if (trackRect.width <= 0) return min

    const rawPercent = (clientX - trackRect.left) / trackRect.width
    const clampedPercent = Math.min(1, Math.max(0, rawPercent))
    const rawValue = min + clampedPercent * (max - min)
    return Math.round(rawValue)
  }

  const flushDebouncedScoreUpdate = () => {
    const pendingScoreUpdate = pendingScoreUpdateReference.current
    if (!pendingScoreUpdate) return
    juryContestStore.setScore(
      pendingScoreUpdate.participantId,
      pendingScoreUpdate.criterionId,
      pendingScoreUpdate.value,
    )
    pendingScoreUpdateReference.current = null
  }

  const scheduleDebouncedScoreUpdate = (paramsForScore: { participantId: number; criterionId: number; value: number }) => {
    pendingScoreUpdateReference.current = paramsForScore
    if (scoreUpdateTimeoutIdReference.current !== null) return

    scoreUpdateTimeoutIdReference.current = setTimeout(() => {
      scoreUpdateTimeoutIdReference.current = null
      flushDebouncedScoreUpdate()
    }, scoreUpdateDebounceMs)
  }

  const startPriorityDrag = (nextIndex: number, pointerId: number, element: HTMLDivElement) => {
    touchPointerIdReference.current = pointerId
    setTouchDragFrom(nextIndex)
    setTouchDragOver(nextIndex)
    element.setPointerCapture(pointerId)
  }

  const movePriorityDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (touchPointerIdReference.current !== event.pointerId) return
    event.preventDefault()
    const hoverElement = document.elementFromPoint(event.clientX, event.clientY)
    const hoverRowElement = hoverElement?.closest('[data-priority-row-index]')
    if (!hoverRowElement) return
    const rawIndex = hoverRowElement.getAttribute('data-priority-row-index')
    const overIndex = rawIndex ? Number.parseInt(rawIndex, 10) : Number.NaN
    if (Number.isNaN(overIndex)) return
    setTouchDragOver(overIndex)
  }

  const endPriorityDrag = (pointerId: number) => {
    if (touchPointerIdReference.current !== pointerId) return
    const from = touchDragFrom
    const to = touchDragOver
    touchPointerIdReference.current = null
    setTouchDragFrom(null)
    setTouchDragOver(null)
    if (from === null || to === null || from === to) return
    juryContestStore.movePriorityCriterion(from, to)
  }

  const cancelPriorityDrag = (pointerId: number) => {
    if (touchPointerIdReference.current !== pointerId) return
    touchPointerIdReference.current = null
    setTouchDragFrom(null)
    setTouchDragOver(null)
  }

  return {
    touchDragFrom,
    touchDragOver,
    isMobilePriorityConfirmOpen,
    isMobileLeaveConfirmOpen,
    touchPointerIdReference,
    pendingScoreUpdateReference,
    scoreSliderPointerStateReference,
    openPriorityConfirm: () => setIsMobilePriorityConfirmOpen(true),
    closePriorityConfirm: () => setIsMobilePriorityConfirmOpen(false),
    openLeaveConfirm: () => setIsMobileLeaveConfirmOpen(true),
    closeLeaveConfirm: () => setIsMobileLeaveConfirmOpen(false),
    closeModal,
    requestCloseModal,
    getScoreByPointerPosition,
    flushDebouncedScoreUpdate,
    scheduleDebouncedScoreUpdate,
    startPriorityDrag,
    movePriorityDrag,
    endPriorityDrag,
    cancelPriorityDrag,
  }
}
