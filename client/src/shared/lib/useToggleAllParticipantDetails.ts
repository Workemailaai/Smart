import { useCallback, useEffect, useRef, useState } from 'react'

/** Управление раскрытием всех `<details>` внутри контейнера-списка участников */
export function useToggleAllParticipantDetails(resetKey?: string | number) {
  const participantSectionsRef = useRef<HTMLDivElement>(null)
  const [areAllParticipantDetailsExpanded, setAreAllParticipantDetailsExpanded] = useState(false)

  useEffect(() => {
    setAreAllParticipantDetailsExpanded(false)
  }, [resetKey])

  const toggleAllParticipantDetails = useCallback(() => {
    const detailsElements = participantSectionsRef.current?.querySelectorAll('details')
    if (!detailsElements?.length) return

    const shouldExpand = !areAllParticipantDetailsExpanded
    detailsElements.forEach((detailsElement) => {
      detailsElement.open = shouldExpand
    })
    setAreAllParticipantDetailsExpanded(shouldExpand)
  }, [areAllParticipantDetailsExpanded])

  return {
    participantSectionsRef,
    areAllParticipantDetailsExpanded,
    toggleAllParticipantDetails,
  }
}
