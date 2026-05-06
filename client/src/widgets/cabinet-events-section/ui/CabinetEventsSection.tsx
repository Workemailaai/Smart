import { observer } from 'mobx-react-lite'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { ContestCard, contestStore, getContestTypes, type IContest } from '@/entities/contest'
import { ContestTypeFilter, useContestTypeFilters } from '@/features/contest-type-filter'
import { JuryEventsWidget } from '@/widgets/cabinet-jury-events'
import { OrganizerEventsWidget } from '@/widgets/cabinet-organizer-events'
import type { CabinetEventsSectionProps } from '../model/types'
import styles from './CabinetEventsSection.module.css'

function filterContestsByType(contests: IContest[], selectedType: string) {
  if (selectedType === 'all') {
    return contests
  }
  return contests.filter((contest) => contest.contestType === selectedType)
}

export const CabinetEventsSection = observer(function CabinetEventsSection(props: CabinetEventsSectionProps) {
  const { isOrganizer, onJuryContestOpen } = props
  const navigate = useNavigate()
  const [contestTypeOptions, setContestTypeOptions] = useState<{ id: string; label: string }[]>([])
  const {
    pendingFilterType,
    ratedFilterType,
    completedFilterType,
    isPendingFilterOpen,
    isRatedFilterOpen,
    isCompletedFilterOpen,
    togglePendingFilter,
    toggleRatedFilter,
    toggleCompletedFilter,
    selectPendingFilterType,
    selectRatedFilterType,
    selectCompletedFilterType,
  } = useContestTypeFilters()

  useEffect(() => {
    const loadContestTypes = async () => {
      try {
        const response = await getContestTypes()
        setContestTypeOptions(response.data ?? [])
      } catch {
        setContestTypeOptions([])
      }
    }
    void loadContestTypes()
  }, [])

  const pendingContests = isOrganizer
    ? contestStore.organizerInProgressContests
    : contestStore.juryPendingContests
  const ratedContests = isOrganizer
    ? contestStore.organizerReadyToPublishContests
    : contestStore.juryRatedContests
  const completedContests = isOrganizer
    ? contestStore.organizerCompletedContests
    : contestStore.juryCompletedContests

  const hasNoOrganizerContests =
    isOrganizer &&
    pendingContests.length === 0 &&
    ratedContests.length === 0 &&
    completedContests.length === 0

  const titleByType = new Map<string, string>()
  contestTypeOptions.forEach((option) => {
    titleByType.set(option.id, option.label)
  })
  contestStore.contests.forEach((contest) => {
    if (contest.contestType && !titleByType.has(contest.contestType)) {
      titleByType.set(contest.contestType, contest.contestType)
    }
  })
  const availableContestTypeOptions = [{ id: 'all', label: 'Все' }, ...Array.from(titleByType, ([id, label]) => ({ id, label }))]

  const getSelectedFilterTitle = (selectedType: string) => {
    return availableContestTypeOptions.find((option) => option.id === selectedType)?.label || 'Все'
  }

  const filteredPendingContests = filterContestsByType(pendingContests, pendingFilterType)
  const filteredRatedContests = filterContestsByType(ratedContests, ratedFilterType)
  const filteredCompletedContests = filterContestsByType(completedContests, completedFilterType)

  return (
    <div className={styles.eventsLayout}>
      {hasNoOrganizerContests && !contestStore.isLoading && !contestStore.error ? (
        <div className={styles.eventsEmptyState}>
          <p className={styles.eventsEmptyTitle}>У вас еще нет ни одного мероприятия</p>
          <button
            className={styles.eventsEmptyButton}
            type="button"
            onClick={() => navigate('/cabinet/constructor')}
          >
            Перейти в конструктор
          </button>
        </div>
      ) : (
        <>
          <section className={styles.eventsCard}>
            {isOrganizer ? (
              <OrganizerEventsWidget
                title="Опубликовать результаты"
                count={filteredRatedContests.length}
                tone="orange"
                emptyText="Пока нет мероприятий"
                isLoading={contestStore.isLoading}
                errorText={contestStore.error}
                hasItems={filteredRatedContests.length > 0}
                filterSlot={
                  <ContestTypeFilter
                    options={availableContestTypeOptions}
                    selectedType={ratedFilterType}
                    selectedTitle={getSelectedFilterTitle(ratedFilterType)}
                    isOpen={isRatedFilterOpen}
                    onToggle={toggleRatedFilter}
                    onSelect={selectRatedFilterType}
                  />
                }
                cardsSlot={filteredRatedContests.map((contest) => (
                  <ContestCard
                    contest={contest}
                    key={contest.id}
                    organizerLayout
                    onDelete={() => contestStore.deleteContest(contest.id)}
                    onOpen={() => navigate(`/cabinet/events/${contest.id}/organizer`)}
                  />
                ))}
              />
            ) : (
              <JuryEventsWidget
                title="Ждут оценки"
                count={filteredPendingContests.length}
                tone="blue"
                emptyText="Пока нет мероприятий"
                isLoading={contestStore.isLoading}
                errorText={contestStore.error}
                hasItems={filteredPendingContests.length > 0}
                filterSlot={
                  <ContestTypeFilter
                    options={availableContestTypeOptions}
                    selectedType={pendingFilterType}
                    selectedTitle={getSelectedFilterTitle(pendingFilterType)}
                    isOpen={isPendingFilterOpen}
                    onToggle={togglePendingFilter}
                    onSelect={selectPendingFilterType}
                  />
                }
                cardsSlot={filteredPendingContests.map((contest) => (
                  <ContestCard
                    contest={contest}
                    juryCabinetCompact
                    key={contest.id}
                    onOpen={() => onJuryContestOpen(contest.id)}
                  />
                ))}
              />
            )}
          </section>

          <section className={styles.eventsCard}>
            {isOrganizer ? (
              <OrganizerEventsWidget
                title="Идет процесс оценивания"
                count={filteredPendingContests.length}
                tone="blue"
                emptyText="Пока нет оцененных мероприятий"
                isLoading={contestStore.isLoading}
                errorText={contestStore.error}
                hasItems={filteredPendingContests.length > 0}
                filterSlot={
                  <ContestTypeFilter
                    options={availableContestTypeOptions}
                    selectedType={pendingFilterType}
                    selectedTitle={getSelectedFilterTitle(pendingFilterType)}
                    isOpen={isPendingFilterOpen}
                    onToggle={togglePendingFilter}
                    onSelect={selectPendingFilterType}
                  />
                }
                cardsSlot={filteredPendingContests.map((contest) => (
                  <ContestCard
                    contest={contest}
                    key={contest.id}
                    organizerLayout
                    onDelete={() => contestStore.deleteContest(contest.id)}
                    onOpen={() => navigate(`/cabinet/events/${contest.id}/organizer`)}
                  />
                ))}
              />
            ) : (
              <JuryEventsWidget
                title="Ждут результата"
                count={filteredRatedContests.length}
                tone="orange"
                emptyText="Пока нет оцененных мероприятий"
                isLoading={contestStore.isLoading}
                errorText={contestStore.error}
                hasItems={filteredRatedContests.length > 0}
                filterSlot={
                  <ContestTypeFilter
                    options={availableContestTypeOptions}
                    selectedType={ratedFilterType}
                    selectedTitle={getSelectedFilterTitle(ratedFilterType)}
                    isOpen={isRatedFilterOpen}
                    onToggle={toggleRatedFilter}
                    onSelect={selectRatedFilterType}
                  />
                }
                cardsSlot={filteredRatedContests.map((contest) => (
                  <ContestCard
                    contest={contest}
                    juryCabinetCompact
                    key={contest.id}
                    onOpen={() => onJuryContestOpen(contest.id)}
                  />
                ))}
              />
            )}
          </section>

          {isOrganizer ? (
            <section className={styles.eventsCard}>
              <OrganizerEventsWidget
                title="Завершенные"
                count={filteredCompletedContests.length}
                tone="green"
                emptyText="Пока нет завершенных мероприятий"
                isLoading={contestStore.isLoading}
                errorText={contestStore.error}
                hasItems={filteredCompletedContests.length > 0}
                filterSlot={
                  <ContestTypeFilter
                    options={availableContestTypeOptions}
                    selectedType={completedFilterType}
                    selectedTitle={getSelectedFilterTitle(completedFilterType)}
                    isOpen={isCompletedFilterOpen}
                    onToggle={toggleCompletedFilter}
                    onSelect={selectCompletedFilterType}
                  />
                }
                cardsSlot={filteredCompletedContests.map((contest) => (
                  <ContestCard
                    contest={contest}
                    key={contest.id}
                    organizerLayout
                    onDelete={() => contestStore.deleteContest(contest.id)}
                    onOpen={() => navigate(`/cabinet/events/${contest.id}/organizer`)}
                  />
                ))}
              />
            </section>
          ) : (
            <section className={styles.eventsCard}>
              <JuryEventsWidget
                title="Завершенные"
                count={filteredCompletedContests.length}
                tone="green"
                emptyText="Пока нет завершенных мероприятий"
                isLoading={contestStore.isLoading}
                errorText={contestStore.error}
                hasItems={filteredCompletedContests.length > 0}
                filterSlot={
                  <ContestTypeFilter
                    options={availableContestTypeOptions}
                    selectedType={completedFilterType}
                    selectedTitle={getSelectedFilterTitle(completedFilterType)}
                    isOpen={isCompletedFilterOpen}
                    onToggle={toggleCompletedFilter}
                    onSelect={selectCompletedFilterType}
                  />
                }
                cardsSlot={filteredCompletedContests.map((contest) => (
                  <ContestCard
                    contest={contest}
                    juryCabinetCompact
                    key={contest.id}
                    onOpen={() => onJuryContestOpen(contest.id)}
                  />
                ))}
              />
            </section>
          )}
        </>
      )}
    </div>
  )
})
