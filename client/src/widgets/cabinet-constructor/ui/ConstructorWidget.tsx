import localStyles from './ConstructorWidget.module.css'
import type { KeyboardEvent } from 'react'
import { TemplateCard } from '@/entities/template'
import { TemplateCarouselControls } from '@/features/template-carousel'
import type { ConstructorWidgetProps } from '../model/types'

export function ConstructorWidget(props: ConstructorWidgetProps) {
  const {
    templates,
    isTemplatesLoading,
    templatesError,
    deletingTemplateId,
    canScrollLeft,
    canScrollRight,
    onCreateEvent,
    onOpenTemplate,
    onDeleteTemplate,
    onScrollLeft,
    onScrollRight,
    onGridReferenceChange,
  } = props

  const onTemplateCardKeyDown = (event: KeyboardEvent<HTMLDivElement>, templateId: number) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onOpenTemplate(templateId)
    }
  }

  return (
    <div className={localStyles.block}>
      <div className={localStyles.hero}>
        <button className={localStyles.heroCreateButton} type="button" onClick={onCreateEvent}>
          <span className={localStyles.heroCreateInner}>
            <span className={localStyles.heroCreatePlusH} />
            <span className={localStyles.heroCreatePlusV} />
          </span>
        </button>
        <h3 className={localStyles.title}>Создать мероприятие</h3>
      </div>
      <div className={localStyles.templates}>
        <div className={localStyles.templatesHeader}>
          <p className={localStyles.templatesTitle}>Шаблоны</p>
          <TemplateCarouselControls
            canScrollLeft={canScrollLeft}
            canScrollRight={canScrollRight}
            onScrollLeft={onScrollLeft}
            onScrollRight={onScrollRight}
          />
        </div>
        <div className={localStyles.carouselRow}>
          <button
            className={localStyles.newTemplate}
            type="button"
            onClick={onCreateEvent}
            aria-label="Создать мероприятие без шаблона"
          >
            <span className={localStyles.newTemplateInner}>
              <span className={localStyles.newTemplatePlusH} />
              <span className={localStyles.newTemplatePlusV} />
            </span>
          </button>
          <div className={localStyles.templateGridWrap}>
            <div className={localStyles.templateGrid} ref={onGridReferenceChange}>
              {isTemplatesLoading ? <p className={localStyles.helperText}>Загрузка шаблонов...</p> : null}
              {templatesError ? <p className={localStyles.errorText}>{templatesError}</p> : null}
              {!isTemplatesLoading && !templatesError
                ? templates.map((template) => (
                    <div
                      key={template.id}
                      className={localStyles.templateCardBtn}
                      role="button"
                      tabIndex={0}
                      onClick={() => onOpenTemplate(template.id)}
                      onKeyDown={(event) => onTemplateCardKeyDown(event, template.id)}
                    >
                      <TemplateCard
                        template={template}
                        isDeleting={deletingTemplateId === template.id}
                        onDelete={() => void onDeleteTemplate(template.id, template.name)}
                      />
                    </div>
                  ))
                : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
