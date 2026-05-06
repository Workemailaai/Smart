import type { SetURLSearchParams } from 'react-router'

type UseJuryContestOpeningParams = {
  isMobileViewport: boolean
  navigate: (path: string) => void
  searchParams: URLSearchParams
  setSearchParams: SetURLSearchParams
}

export function useJuryContestOpening(params: UseJuryContestOpeningParams) {
  const { isMobileViewport, navigate, searchParams, setSearchParams } = params

  const openJuryContestModal = (contestId: number) => {
    const nextSearchParams = new URLSearchParams(searchParams)
    nextSearchParams.set('juryContestId', String(contestId))
    setSearchParams(nextSearchParams, { replace: false })
  }

  const onJuryContestOpen = (contestId: number) => {
    if (!isMobileViewport) {
      navigate(`/cabinet/events/${contestId}/jury`)
      return
    }
    openJuryContestModal(contestId)
  }

  return {
    onJuryContestOpen,
    openJuryContestModal,
  }
}
