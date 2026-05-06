import localStyles from './OrganizerEventsWidget.module.css'
import type { OrganizerEventsWidgetProps } from '../model/types'

export function OrganizerEventsWidget(props: OrganizerEventsWidgetProps) {
  const { title, count, tone, emptyText, isLoading, errorText, hasItems, filterSlot, cardsSlot } = props
  const toneClassName = tone === 'blue' ? localStyles.toneBlue : tone === 'orange' ? localStyles.toneOrange : localStyles.toneGreen

  return (
    <div className={localStyles.root}>
      <div className={localStyles.sectionHeader}>
        <div className={localStyles.sectionTitleWrap}>
          <span className={`${localStyles.sectionDot} ${toneClassName}`}>
            <span />
          </span>
          <h3 className={localStyles.sectionTitle}>{title}</h3>
          <span className={`${localStyles.sectionCount} ${toneClassName}`}>({count})</span>
        </div>
        {filterSlot}
      </div>
      <div className={localStyles.eventsBody}>
        {isLoading ? <p className={`${localStyles.helperText} ${localStyles.eventsHelperText}`}>Загрузка мероприятий...</p> : null}
        {errorText ? <p className={localStyles.errorText}>{errorText}</p> : null}
        <div className={`${localStyles.tableHeader} ${localStyles.tableHeaderWithAction}`}>
          <span className={localStyles.tableHeaderCover}>Обложка</span>
          <span>Название конкурса</span>
          <span>Дата</span>
          <span>Тип конкурса</span>
          <span className={localStyles.tableHeaderVotes}>Проголосовало</span>
          <span className={localStyles.tableHeaderAction} />
        </div>
        {!isLoading && !errorText && !hasItems ? (
          <p className={`${localStyles.helperText} ${localStyles.eventsHelperText}`}>{emptyText}</p>
        ) : null}
        {cardsSlot}
      </div>
    </div>
  )
}
