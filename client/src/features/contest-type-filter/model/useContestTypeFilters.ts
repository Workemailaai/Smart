import { useState } from 'react'

type ContestFilterKey = 'pending' | 'rated' | 'completed'

export function useContestTypeFilters() {
  const [openFilterKey, setOpenFilterKey] = useState<ContestFilterKey | null>(null)
  const [pendingFilterType, setPendingFilterType] = useState('all')
  const [ratedFilterType, setRatedFilterType] = useState('all')
  const [completedFilterType, setCompletedFilterType] = useState('all')

  const toggleFilter = (filterKey: ContestFilterKey) => {
    setOpenFilterKey((previousFilterKey) => (previousFilterKey === filterKey ? null : filterKey))
  }

  const selectPendingFilterType = (filterType: string) => {
    setPendingFilterType(filterType)
    setOpenFilterKey(null)
  }

  const selectRatedFilterType = (filterType: string) => {
    setRatedFilterType(filterType)
    setOpenFilterKey(null)
  }

  const selectCompletedFilterType = (filterType: string) => {
    setCompletedFilterType(filterType)
    setOpenFilterKey(null)
  }

  return {
    pendingFilterType,
    ratedFilterType,
    completedFilterType,
    isPendingFilterOpen: openFilterKey === 'pending',
    isRatedFilterOpen: openFilterKey === 'rated',
    isCompletedFilterOpen: openFilterKey === 'completed',
    togglePendingFilter: () => toggleFilter('pending'),
    toggleRatedFilter: () => toggleFilter('rated'),
    toggleCompletedFilter: () => toggleFilter('completed'),
    selectPendingFilterType,
    selectRatedFilterType,
    selectCompletedFilterType,
  }
}
