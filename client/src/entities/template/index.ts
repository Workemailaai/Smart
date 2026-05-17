export type { ITemplate, ITemplateCriterion } from './model/template.types'
export { normalizeTemplateCriteria } from './model/template.types'
export {
  getTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplateById,
} from './api/templateApi'
export { templateStore } from './model/templateStore'
export { TemplateCard } from './ui/TemplateCard'
