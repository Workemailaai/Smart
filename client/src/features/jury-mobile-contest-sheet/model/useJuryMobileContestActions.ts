import { contestStore } from '@/entities/contest'
import { juryContestStore } from '@/features/jury-contest/model/juryContestStore'

type UseJuryMobileContestActionsParams = {
  juryContestId: number
  userId?: number
  closeModal: () => void
  closePriorityConfirm: () => void
  navigate: (path: string) => void
}

export function useJuryMobileContestActions(params: UseJuryMobileContestActionsParams) {
  const { juryContestId, userId, closeModal, closePriorityConfirm, navigate } = params

  const onPriorityContinue = async () => {
    if (!userId || Number.isNaN(juryContestId)) return
    await juryContestStore.confirmPriorityOrder(juryContestId, userId)
    if (!juryContestStore.error) {
      closePriorityConfirm()
    }
  }

  const onSubmitScores = async () => {
    if (Number.isNaN(juryContestId)) return
    await juryContestStore.submit(juryContestId)
    await contestStore.fetchContests()
    if (!juryContestStore.error) {
      closeModal()
    }
  }

  const onStartRevote = async () => {
    if (Number.isNaN(juryContestId)) return
    await juryContestStore.startRevote(juryContestId)
    await contestStore.fetchContests()
  }

  const onOpenResults = () => {
    if (Number.isNaN(juryContestId)) return
    closeModal()
    navigate(`/cabinet/events/${juryContestId}/results`)
  }

  return {
    onPriorityContinue,
    onSubmitScores,
    onStartRevote,
    onOpenResults,
  }
}
