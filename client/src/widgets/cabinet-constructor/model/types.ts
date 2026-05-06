import type { ITemplate } from '@/entities/template'

export type ConstructorWidgetProps = {
  templates: ITemplate[]
  isTemplatesLoading: boolean
  templatesError: string | null
  deletingTemplateId: number | null
  canScrollLeft: boolean
  canScrollRight: boolean
  onCreateEvent: () => void
  onOpenTemplate: (templateId: number) => void
  onDeleteTemplate: (templateId: number, templateName: string) => void | Promise<void>
  onScrollLeft: () => void
  onScrollRight: () => void
  onGridReferenceChange: (element: HTMLDivElement | null) => void
}
