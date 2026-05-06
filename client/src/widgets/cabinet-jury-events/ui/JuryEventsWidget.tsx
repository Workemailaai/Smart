import localStyles from './JuryEventsWidget.module.css'
import type { JuryEventsWidgetProps } from '../model/types'

export function JuryEventsWidget(props: JuryEventsWidgetProps) {
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
        <div className={localStyles.tableHeader}>
          <span className={localStyles.tableHeaderCover}>Обложка</span>
          <span>Название конкурса</span>
          <span>Дата</span>
          <span>Тип конкурса</span>
        </div>
        {isLoading ? <p className={`${localStyles.helperText} ${localStyles.eventsHelperText}`}>Загрузка мероприятий...</p> : null}
        {errorText ? <p className={localStyles.errorText}>{errorText}</p> : null}
        {!isLoading && !errorText && !hasItems ? (
          <p className={`${localStyles.helperText} ${localStyles.eventsHelperText}`}>{emptyText}</p>
        ) : null}
        {cardsSlot}
      </div>
    </div>
  )
}
