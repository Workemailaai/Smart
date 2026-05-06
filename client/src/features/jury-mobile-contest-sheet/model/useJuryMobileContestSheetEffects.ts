import { useEffect, useRef, type RefObject } from 'react'
import { juryContestStore } from '@/features/jury-contest/model/juryContestStore'

type UseJuryMobileContestSheetEffectsParams = {
  userId: number | undefined
  isJuryContestModalOpen: boolean
  isMobileViewport: boolean
  prioritySheetContentReference: RefObject<HTMLDivElement | null>
  prioritySaveButtonReference: RefObject<HTMLButtonElement | null>
  shouldWarnOnMobileModalClose: boolean
}

/** Автоскролл к кнопке сохранения приоритетов и предупреждение при закрытии вкладки с несохранёнными оценками */
export function useJuryMobileContestSheetEffects(params: UseJuryMobileContestSheetEffectsParams) {
  const {
    userId,
    isJuryContestModalOpen,
    isMobileViewport,
    prioritySheetContentReference,
    prioritySaveButtonReference,
    shouldWarnOnMobileModalClose,
  } = params

  const hasAutoScrolledPriorityReference = useRef(false)
  const priorityDraftCount = juryContestStore.priorityDraftIds.length
  const hasJuryContestView = Boolean(juryContestStore.view)

  useEffect(() => {
    if (!userId || !isJuryContestModalOpen || !isMobileViewport) {
      hasAutoScrolledPriorityReference.current = false
      return
    }

    const shouldShowPriorityStep = hasJuryContestView && juryContestStore.shouldShowCriteriaPriorityStep(userId)
    if (!shouldShowPriorityStep || priorityDraftCount <= 5) {
      hasAutoScrolledPriorityReference.current = false
      return
    }

    if (hasAutoScrolledPriorityReference.current) {
      return
    }

    const contentElement = prioritySheetContentReference.current
    const saveButtonElement = prioritySaveButtonReference.current
    if (!contentElement || !saveButtonElement) {
      return
    }

    requestAnimationFrame(() => {
      const nextScrollTop = Math.max(
        0,
        saveButtonElement.offsetTop - contentElement.clientHeight + saveButtonElement.offsetHeight + 12,
      )
      contentElement.scrollTo({ top: nextScrollTop, behavior: 'auto' })
      hasAutoScrolledPriorityReference.current = true
    })
  }, [userId, isJuryContestModalOpen, isMobileViewport, hasJuryContestView, priorityDraftCount])

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isJuryContestModalOpen || !shouldWarnOnMobileModalClose) return
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', onBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
    }
  }, [isJuryContestModalOpen, shouldWarnOnMobileModalClose])
}
