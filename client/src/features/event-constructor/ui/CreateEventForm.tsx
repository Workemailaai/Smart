import { observer } from 'mobx-react-lite'
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import {
  contestStore,
  createContestFull,
  getContestTypes,
  getOrganizerContestView,
  updateContestRoster,
} from '@/entities/contest'
import { contestRosterEditStore } from '@/features/contest-roster-edit'
import { createTemplate, getTemplateById, templateStore, updateTemplate } from '@/entities/template'
import { ConfirmDialog, toastStore } from '@/shared'
import type { IContestTypeOption } from '@/entities/contest'
import { resolveMediaUrl } from '@/shared'
import { formatRuPhoneMask } from '@/shared/lib/ruPhone'
import { createEventFormStore, type DraftJury, type DraftParticipant } from '../model/createEventFormStore'
import { ParticipantProfileModal } from './ParticipantProfileModal'
import { JuryProfileModal } from './JuryProfileModal'
import styles from './CreateEventForm.module.css'

/** Шесть основных типов в дропдауне конструктора (совпадает с макетом) */
const PRIMARY_CONTEST_TYPE_IDS = new Set([
  'creative',
  'sports',
  'designers',
  'rating_objects',
  'student_work',
  'other',
])

const FALLBACK_CONTEST_TYPES: IContestTypeOption[] = [
  { id: 'creative', label: 'Творческий конкурс' },
  { id: 'sports', label: 'Спортивный конкурс' },
  { id: 'designers', label: 'Конкурс дизайнеров' },
  { id: 'rating_objects', label: 'Построение рейтинга объектов' },
  { id: 'student_work', label: 'Оценка студенческих работ' },
  { id: 'other', label: 'Другое' },
]

const PRIMARY_ORDER = [
  'creative',
  'sports',
  'designers',
  'rating_objects',
  'student_work',
  'other',
] as const

const CRITERIA_INEQUALITY_OPTIONS: Array<{ value: 'gt' | 'eq' | 'gte'; label: string }> = [
  { value: 'gt', label: '>' },
  { value: 'eq', label: '=' },
  { value: 'gte', label: '>=' },
]

/** Общие границы оценки для всех показателей (согласованы с валидацией на сервере) */
function syncAllCriteriaBounds(
  store: typeof createEventFormStore,
  minRaw: number,
  maxRaw: number,
) {
  let m = Math.round(minRaw)
  let M = Math.round(maxRaw)
  if (!Number.isFinite(m) || m < 0) m = 0
  if (!Number.isFinite(M) || M < 1) M = 2
  if (M <= m) M = m + 1
  store.criteria.forEach((c) => store.updateCriterion(c.localId, { minScore: m, maxScore: M }))
}

/** Границы для первого показателя из полей формы (с тем же зажимом, что и syncAllCriteriaBounds) */
function getClampedBoundsFromStrings(
  minStr: string,
  maxStr: string,
  fallbackMin: number,
  fallbackMax: number,
): { minScore: number; maxScore: number } {
  const parsePart = (s: string, fallback: number) => {
    const t = s.trim()
    if (t === '') return fallback
    const n = Number(t)
    return Number.isFinite(n) ? Math.round(n) : fallback
  }
  let m = parsePart(minStr, fallbackMin)
  let M = parsePart(maxStr, fallbackMax)
  if (!Number.isFinite(m) || m < 0) m = 0
  if (!Number.isFinite(M) || M < 1) M = 2
  if (M <= m) M = m + 1
  return { minScore: m, maxScore: M }
}

type UnsafeFormAction = 'create' | 'saveTemplate' | 'saveChanges' | 'saveAsNew' | 'createContest'

const CONTEST_TYPE_LABELS: Record<string, string> = {
  creative: 'Творческий конкурс',
  sports: 'Спортивный конкурс',
  designers: 'Конкурс дизайнеров',
  rating_objects: 'Построение рейтинга объектов',
  student_work: 'Оценка студенческих работ',
  other: 'Другое',
}

type CreateEventFormProps = {
  mode?: 'create' | 'rosterEdit'
}

export const CreateEventForm = observer(function CreateEventForm({ mode = 'create' }: CreateEventFormProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { templateId: templateIdParam, contestId: contestIdParam } = useParams()
  const isRosterEdit = mode === 'rosterEdit'
  const isEditMode = !isRosterEdit && location.pathname.includes('/constructor/edit/')
  const parsedTemplateId = templateIdParam ? Number.parseInt(templateIdParam, 10) : Number.NaN
  const parsedContestId = contestIdParam ? Number.parseInt(contestIdParam, 10) : Number.NaN
  const store = createEventFormStore
  const rosterStore = contestRosterEditStore
  const [typeOptions, setTypeOptions] = useState<IContestTypeOption[]>([])
  const [participantModalOpen, setParticipantModalOpen] = useState(false)
  const [participantDraft, setParticipantDraft] = useState<DraftParticipant | null>(null)
  const [participantModalKey, setParticipantModalKey] = useState(0)
  const [juryModalOpen, setJuryModalOpen] = useState(false)
  const [juryDraft, setJuryDraft] = useState<DraftJury | null>(null)
  const [juryModalKey, setJuryModalKey] = useState(0)
  /** Строковое состояние полей границ — чтобы можно было стереть ввод и набрать число заново */
  const [boundaryMinStr, setBoundaryMinStr] = useState(() =>
    String(store.criteria[0]?.minScore ?? 0),
  )
  const [boundaryMaxStr, setBoundaryMaxStr] = useState(() =>
    String(store.criteria[0]?.maxScore ?? 10),
  )
  /** Черновик названия для следующей строки показателя (добавление только после ввода + галка) */
  const [newCriterionDraftName, setNewCriterionDraftName] = useState('')
  const [isUnsavedCriterionConfirmOpen, setIsUnsavedCriterionConfirmOpen] = useState(false)
  const [pendingUnsafeAction, setPendingUnsafeAction] = useState<UnsafeFormAction | null>(null)
  const [isTemplateLoading, setIsTemplateLoading] = useState(false)
  const [isExitEditConfirmOpen, setIsExitEditConfirmOpen] = useState(false)
  const [isExitRosterConfirmOpen, setIsExitRosterConfirmOpen] = useState(false)
  const [isRosterLoading, setIsRosterLoading] = useState(isRosterEdit)
  const [rosterLoadError, setRosterLoadError] = useState<string | null>(null)
  const [isCreateContestConfirmOpen, setIsCreateContestConfirmOpen] = useState(false)
  /** DnD: индекс перетаскиваемой строки и подсветка цели */
  const [criterionDragFrom, setCriterionDragFrom] = useState<number | null>(null)
  const [criterionDragOver, setCriterionDragOver] = useState<number | null>(null)
  const [participantDragFrom, setParticipantDragFrom] = useState<number | null>(null)
  const [participantDragOver, setParticipantDragOver] = useState<number | null>(null)
  const [openedToggleTooltip, setOpenedToggleTooltip] = useState<'weights' | 'jury' | null>(null)

  useEffect(() => {
    if (!isRosterEdit) return

    if (!Number.isFinite(parsedContestId)) {
      navigate('/cabinet/events', { replace: true })
      return
    }

    rosterStore.reset()
    store.reset()
    setIsRosterLoading(true)
    setRosterLoadError(null)

    void Promise.all([getOrganizerContestView(parsedContestId), getContestTypes()])
      .then(([viewResponse, typesResponse]) => {
        if (!viewResponse.data) {
          setRosterLoadError('Мероприятие не найдено')
          return
        }
        const status = viewResponse.data.contest.status
        if (status !== 'in_progress' && status !== 'judging_completed') {
          setRosterLoadError('Состав мероприятия нельзя редактировать на этом этапе')
          return
        }
        const typeLabel =
          typesResponse.data?.find((typeOption) => typeOption.id === viewResponse.data?.contest.contestType)
            ?.label ||
          CONTEST_TYPE_LABELS[viewResponse.data.contest.contestType || ''] ||
          viewResponse.data.contest.contestType ||
          ''
        rosterStore.loadFromOrganizerView(viewResponse.data, typeLabel)
        store.applyOrganizerContestDisplay(viewResponse.data)
        const firstCriterion = viewResponse.data.criteria[0]
        if (firstCriterion) {
          setBoundaryMinStr(String(firstCriterion.minScore ?? 0))
          setBoundaryMaxStr(String(firstCriterion.maxScore))
        }
      })
      .catch(() => {
        setRosterLoadError('Не удалось загрузить мероприятие')
      })
      .finally(() => {
        setIsRosterLoading(false)
      })

    return () => {
      rosterStore.reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- загрузка только при смене contestId
  }, [isRosterEdit, parsedContestId])

  useEffect(() => {
    if (isRosterEdit) return

    if (isEditMode) {
      if (!Number.isFinite(parsedTemplateId)) {
        navigate('/cabinet/constructor', { replace: true })
        return
      }
      createEventFormStore.reset()
      setIsTemplateLoading(true)
      void getTemplateById(parsedTemplateId)
        .then((response) => {
          if (response.data) {
            createEventFormStore.beginEditSession(response.data)
            return
          }
          navigate('/cabinet/constructor', { replace: true })
        })
        .catch(() => {
          createEventFormStore.templateMessage = 'Не удалось загрузить шаблон'
          navigate('/cabinet/constructor', { replace: true })
        })
        .finally(() => {
          setIsTemplateLoading(false)
        })
      return
    }

    const preserveForm = Boolean((location.state as { preserveForm?: boolean } | null)?.preserveForm)
    if (!preserveForm) {
      createEventFormStore.reset()
    } else {
      navigate(location.pathname, { replace: true, state: {} })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- preserveForm читается только при монтировании /new
  }, [isEditMode, isRosterEdit, parsedTemplateId])

  useEffect(() => {
    const c = store.criteria[0]
    if (c) {
      setBoundaryMinStr(String(c.minScore))
      setBoundaryMaxStr(String(c.maxScore))
    }
  }, [store.criteria[0]?.localId, store.criteria[0]?.minScore, store.criteria[0]?.maxScore])

  /** Выкл. значимости → сбрасываем предпочтения жюри. Вкл. предпочтений → при выкл. значимости включаем её автоматически. */
  const handleToggleCriteriaWeights = () => {
    const next = !store.useCriteriaWeights
    store.setUseCriteriaWeights(next)
    if (!next) store.setJuryPreferencesEnabled(false)
  }

  const handleToggleJuryPreferences = () => {
    const next = !store.juryPreferencesEnabled
    if (next) {
      if (!store.useCriteriaWeights) store.setUseCriteriaWeights(true)
      store.setJuryPreferencesEnabled(true)
    } else {
      store.setJuryPreferencesEnabled(false)
    }
  }

  const canReorderCriteria = !isRosterEdit && store.useCriteriaWeights && store.criteria.length >= 2
  const activeParticipants = isRosterEdit ? rosterStore.participants : store.participants
  const activeJury = isRosterEdit ? rosterStore.jury : store.jury

  const commitBoundaryInputs = () => {
    const c0 = store.criteria[0]
    const parsePart = (s: string, fallback: number) => {
      const t = s.trim()
      if (t === '') return fallback
      const n = Number(t)
      return Number.isFinite(n) ? Math.round(n) : fallback
    }
    const m = parsePart(boundaryMinStr, c0?.minScore ?? 1)
    const M = parsePart(boundaryMaxStr, c0?.maxScore ?? 10)
    syncAllCriteriaBounds(store, m, M)
    const c = store.criteria[0]
    if (c) {
      setBoundaryMinStr(String(c.minScore))
      setBoundaryMaxStr(String(c.maxScore))
    } else {
      const { minScore, maxScore } = getClampedBoundsFromStrings(boundaryMinStr, boundaryMaxStr, 1, 10)
      setBoundaryMinStr(String(minScore))
      setBoundaryMaxStr(String(maxScore))
    }
  }

  useEffect(() => {
    void getContestTypes().then((r) => {
      if (r.data?.length) setTypeOptions(r.data)
      else setTypeOptions(FALLBACK_CONTEST_TYPES)
    })
  }, [])

  const typeSelectOptions = useMemo(() => {
    const src = typeOptions.length ? typeOptions : FALLBACK_CONTEST_TYPES
    const primary = PRIMARY_ORDER.map((id) => src.find((t) => t.id === id)).filter(
      (t): t is IContestTypeOption => Boolean(t),
    )
    const ct = store.contestType
    if (ct && !PRIMARY_CONTEST_TYPE_IDS.has(ct)) {
      const legacy = src.find((t) => t.id === ct)
      if (legacy && !primary.some((p) => p.id === legacy.id)) return [legacy, ...primary]
    }
    return primary.length ? primary : FALLBACK_CONTEST_TYPES
  }, [typeOptions, store.contestType])

  const openNewParticipant = () => {
    setParticipantDraft(null)
    setParticipantModalKey((k) => k + 1)
    setParticipantModalOpen(true)
  }

  const openEditParticipant = (p: DraftParticipant) => {
    if (isRosterEdit) return
    setParticipantDraft(p)
    setParticipantModalOpen(true)
  }

  const openNewJury = () => {
    setJuryDraft(null)
    setJuryModalKey((k) => k + 1)
    setJuryModalOpen(true)
  }

  const openEditJury = (j: DraftJury) => {
    if (isRosterEdit) return
    setJuryDraft(j)
    setJuryModalOpen(true)
  }

  const handleRosterBack = () => {
    if (rosterStore.isDirty()) {
      setIsExitRosterConfirmOpen(true)
      return
    }
    navigate('/cabinet/events')
  }

  const handleRosterSave = async () => {
    rosterStore.errorMessage = null
    const validationError = rosterStore.validateForSave()
    if (validationError) {
      rosterStore.errorMessage = validationError
      toastStore.show(validationError, 'error')
      return
    }
    if (!rosterStore.contestId) return
    rosterStore.isSaving = true
    try {
      const response = await updateContestRoster(rosterStore.contestId, rosterStore.buildRosterFormData())
      if (response.data) {
        void contestStore.fetchContests()
        const viewResponse = await getOrganizerContestView(rosterStore.contestId)
        if (viewResponse.data) {
          rosterStore.loadFromOrganizerView(viewResponse.data, rosterStore.contestTypeLabel)
          store.applyOrganizerContestDisplay(viewResponse.data)
          const firstCriterion = viewResponse.data.criteria[0]
          if (firstCriterion) {
            setBoundaryMinStr(String(firstCriterion.minScore ?? 0))
            setBoundaryMaxStr(String(firstCriterion.maxScore))
          }
        } else {
          rosterStore.commitBaseline()
        }
        toastStore.show('Конкурс успешно обновлён')
        return
      }
      const message = response.error || response.message || 'Не удалось сохранить изменения'
      rosterStore.errorMessage = message
      toastStore.show(message, 'error')
    } catch (error) {
      const message = (error as Error)?.message || 'Ошибка при сохранении состава'
      rosterStore.errorMessage = message
      toastStore.show(message, 'error')
    } finally {
      rosterStore.isSaving = false
    }
  }

  const removeActiveParticipant = (localId: string) => {
    if (isRosterEdit) {
      if (!rosterStore.removeParticipant(localId)) {
        rosterStore.errorMessage = 'В мероприятии должен остаться хотя бы один участник'
      } else {
        rosterStore.errorMessage = null
      }
      return
    }
    store.removeParticipant(localId)
  }

  const removeActiveJuryMember = (localId: string) => {
    if (isRosterEdit) {
      if (!rosterStore.removeJuryMember(localId)) {
        rosterStore.errorMessage = 'В мероприятии должно остаться хотя бы одно жюри'
      } else {
        rosterStore.errorMessage = null
      }
      return
    }
    store.removeJuryMember(localId)
  }

  const moveActiveParticipant = (fromIndex: number, toIndex: number) => {
    if (isRosterEdit) {
      rosterStore.moveParticipant(fromIndex, toIndex)
      return
    }
    store.moveParticipant(fromIndex, toIndex)
  }

  const onCoverPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f || !f.type.startsWith('image/')) return
    store.setCover(f)
  }

  const handleCreate = async () => {
    store.submitError = null
    const err = store.validate()
    if (err) {
      store.submitError = err
      return
    }
    store.isSubmitting = true
    try {
      const fd = store.buildFormData()
      const res = await createContestFull(fd)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        store.reset()
        void contestStore.fetchContests()
        navigate('/cabinet/events')
      } else {
        store.submitError = res.error || res.message || 'Не удалось создать мероприятие'
      }
    } catch (e) {
      store.submitError = (e as Error)?.message || 'Ошибка при создании мероприятия'
    } finally {
      store.isSubmitting = false
    }
  }

  const validateTemplatePayload = () => {
    store.templateMessage = null
    const validationError = store.validate()
    if (validationError) {
      store.templateMessage = validationError
      return false
    }
    const snapshot = store.getSnapshotForTemplate()
    if (snapshot.criteria.length === 0) {
      store.templateMessage = 'Добавьте критерии с названиями для шаблона'
      return false
    }
    return true
  }

  const handleSaveTemplate = async () => {
    if (!validateTemplatePayload()) return
    const name = window.prompt('Название шаблона')
    if (!name || !name.trim()) return
    store.isSavingTemplate = true
    try {
      await createTemplate(store.buildTemplateFormData(name.trim()))
      store.templateMessage = 'Шаблон сохранён'
      void templateStore.fetchTemplates()
    } catch (error) {
      store.templateMessage = (error as Error)?.message || 'Ошибка сохранения шаблона'
    } finally {
      store.isSavingTemplate = false
    }
  }

  const handleSaveChanges = async (): Promise<boolean> => {
    if (!store.editingTemplateId || !validateTemplatePayload()) return false
    store.isUpdatingTemplate = true
    try {
      const response = await updateTemplate(store.editingTemplateId, store.buildTemplateFormData())
      if (response.data) {
        templateStore.upsertTemplate(response.data)
        store.beginEditSession(response.data)
        toastStore.show('Изменения сохранены')
        return true
      }
      store.templateMessage = response.error || response.message || 'Не удалось сохранить шаблон'
      return false
    } catch (error) {
      store.templateMessage = (error as Error)?.message || 'Ошибка сохранения шаблона'
      return false
    } finally {
      store.isUpdatingTemplate = false
    }
  }

  const handleSaveAsNewTemplate = async () => {
    if (!validateTemplatePayload()) return
    const name = window.prompt('Название шаблона')
    if (!name || !name.trim()) return
    store.isSavingTemplate = true
    try {
      await createTemplate(store.buildTemplateFormData(name.trim()))
      store.templateMessage = 'Шаблон сохранён'
      void templateStore.fetchTemplates()
    } catch (error) {
      store.templateMessage = (error as Error)?.message || 'Ошибка сохранения шаблона'
    } finally {
      store.isSavingTemplate = false
    }
  }

  const enterCreateContestMode = () => {
    store.clearEditSession()
    navigate('/cabinet/constructor/new', { replace: true, state: { preserveForm: true } })
  }

  const handleCreateContestFromEdit = () => {
    store.submitError = null
    const validationError = store.validate()
    if (validationError) {
      store.submitError = validationError
      return
    }
    if (store.isEditDirty()) {
      setIsCreateContestConfirmOpen(true)
      return
    }
    enterCreateContestMode()
  }

  const onConfirmCreateContestWithoutSave = () => {
    setIsCreateContestConfirmOpen(false)
    enterCreateContestMode()
  }

  const onConfirmSaveAndCreateContest = async () => {
    const isSaved = await handleSaveChanges()
    if (!isSaved) return
    setIsCreateContestConfirmOpen(false)
    enterCreateContestMode()
  }

  const handleEditBack = () => {
    if (store.isEditDirty()) {
      setIsExitEditConfirmOpen(true)
      return
    }
    navigate('/cabinet/constructor')
  }

  const onConfirmExitEdit = () => {
    setIsExitEditConfirmOpen(false)
    navigate('/cabinet/constructor')
  }

  const hasUnsavedCriterionDraft = Boolean(newCriterionDraftName.trim())

  const dispatchUnsafeAction = (action: UnsafeFormAction) => {
    if (action === 'create') {
      void handleCreate()
      return
    }
    if (action === 'saveTemplate') {
      void handleSaveTemplate()
      return
    }
    if (action === 'saveChanges') {
      void handleSaveChanges()
      return
    }
    if (action === 'saveAsNew') {
      void handleSaveAsNewTemplate()
      return
    }
    handleCreateContestFromEdit()
  }

  const runWithUnsavedCriterionGuard = (action: UnsafeFormAction) => {
    if (hasUnsavedCriterionDraft) {
      setPendingUnsafeAction(action)
      setIsUnsavedCriterionConfirmOpen(true)
      return
    }
    dispatchUnsafeAction(action)
  }

  const getUnsafeCriterionProceedLabel = () => {
    if (pendingUnsafeAction === 'saveTemplate' || pendingUnsafeAction === 'saveAsNew') {
      return 'Всё равно сохранить шаблон'
    }
    if (pendingUnsafeAction === 'saveChanges') {
      return 'Всё равно сохранить изменения'
    }
    if (pendingUnsafeAction === 'createContest') {
      return 'Всё равно создать конкурс'
    }
    return 'Всё равно создать мероприятие'
  }

  const onConfirmUnsafeAction = () => {
    if (pendingUnsafeAction) {
      dispatchUnsafeAction(pendingUnsafeAction)
    }
    setIsUnsavedCriterionConfirmOpen(false)
    setPendingUnsafeAction(null)
  }

  const onStayInConstructor = () => {
    setIsUnsavedCriterionConfirmOpen(false)
    setPendingUnsafeAction(null)
  }

  const toggleTooltip = (tooltipId: 'weights' | 'jury') => {
    setOpenedToggleTooltip((previousTooltipId) => (previousTooltipId === tooltipId ? null : tooltipId))
  }

  if (isRosterEdit && isRosterLoading) {
    return <p className={styles.loadingText}>Загрузка мероприятия...</p>
  }

  if (isRosterEdit && rosterLoadError) {
    return (
      <div className={styles.wrap}>
        <p className={styles.error}>{rosterLoadError}</p>
        <button className={styles.btnSecondary} type="button" onClick={() => navigate('/cabinet/events')}>
          К списку мероприятий
        </button>
      </div>
    )
  }

  if (isEditMode && isTemplateLoading) {
    return <p className={styles.loadingText}>Загрузка шаблона...</p>
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.grid2}>
        <section className={`${styles.card} ${styles.cardMuted} ${styles.generalCard}`}>
          <div className={styles.generalTitleRow}>
            <h3 className={styles.cardTitle}>Общая информация</h3>
          </div>
          <div className={styles.titleFieldShell}>
            <input
              className={styles.generalTitleInput}
              id="evt-title"
              onChange={(e) => store.setTitle(e.target.value)}
              placeholder="Введите название мероприятия"
              readOnly={isRosterEdit}
              type="text"
              value={store.title}
            />
          </div>
          <div className={styles.typeBlock} data-show-list="false" data-type="Normal">
            <div className={styles.typeRow}>
              <span className={styles.typeRowLabel}>Тип конкурса</span>
              <div className={styles.typeValueCluster}>
                <span className={styles.typeSelectedLabel}>
                  {typeSelectOptions.find((t) => t.id === store.contestType)?.label ?? ''}
                </span>
                <svg
                  className={styles.typeChevronInline}
                  aria-hidden
                  fill="none"
                  height="24"
                  viewBox="0 0 24 24"
                  width="24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M6 9l6 6 6-6" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
                </svg>
                <select
                  aria-label="Тип конкурса"
                  className={styles.typeSelectOverlay}
                  disabled={isRosterEdit}
                  id="evt-type"
                  onChange={(e) => store.setContestType(e.target.value)}
                  value={store.contestType}
                >
                  {typeSelectOptions.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className={styles.optionsCard}>
            <div className={styles.toggleRow}>
              <div className={styles.toggleLabelGroup}>
                <button
                  aria-expanded={openedToggleTooltip === 'weights'}
                  aria-label="Показать подсказку для значимости показателей"
                  className={styles.toggleInfoButton}
                  onBlur={() => setOpenedToggleTooltip((previousTooltipId) => (previousTooltipId === 'weights' ? null : previousTooltipId))}
                  onClick={() => toggleTooltip('weights')}
                  type="button"
                >
                  <img alt="" className={styles.toggleInfoIcon} src="/info-circle.svg" />
                </button>
                <span className={styles.toggleLabel}>Значимость показателей</span>
                <div
                  className={`${styles.toggleTooltip} ${openedToggleTooltip === 'weights' ? styles.toggleTooltipOpen : ''}`}
                  role="tooltip"
                >
                  Если функция отключена, итоговая оценка рассчитывается как среднее арифметическое всех показателей.
                  Включите её, если отдельные критерии имеют разную значимость и должны влиять на результат в разной степени.
                </div>
              </div>
              <button
                aria-label="Переключить значимость показателей"
                aria-pressed={store.useCriteriaWeights}
                className={`${styles.switchButton} ${isRosterEdit ? styles.switchButtonReadOnly : ''}`}
                data-property-1={store.useCriteriaWeights ? 'Active' : 'Inactive'}
                disabled={isRosterEdit}
                onClick={handleToggleCriteriaWeights}
                type="button"
              >
                <span className={`${styles.switchTrack} ${store.useCriteriaWeights ? styles.switchTrackOn : styles.switchTrackOff}`}>
                  <span className={styles.switchThumb} />
                </span>
              </button>
            </div>
            <div className={styles.toggleRow}>
              <div className={styles.toggleLabelGroup}>
                <button
                  aria-expanded={openedToggleTooltip === 'jury'}
                  aria-label="Показать подсказку для учёта предпочтений жюри"
                  className={styles.toggleInfoButton}
                  onBlur={() => setOpenedToggleTooltip((previousTooltipId) => (previousTooltipId === 'jury' ? null : previousTooltipId))}
                  onClick={() => toggleTooltip('jury')}
                  type="button"
                >
                  <img alt="" className={styles.toggleInfoIcon} src="/info-circle.svg" />
                </button>
                <span className={styles.toggleLabel}>Учитывать предпочтения жюри</span>
                <div
                  className={`${styles.toggleTooltip} ${openedToggleTooltip === 'jury' ? styles.toggleTooltipOpen : ''}`}
                  role="tooltip"
                >
                  Включите, чтобы жюри могли задавать различную степень влияния показателей на итоговую оценку.
                </div>
              </div>
              <button
                aria-label="Переключить учет предпочтений жюри"
                aria-pressed={store.juryPreferencesEnabled}
                className={`${styles.switchButton} ${isRosterEdit ? styles.switchButtonReadOnly : ''}`}
                data-property-1={store.juryPreferencesEnabled ? 'Active' : 'Inactive'}
                disabled={isRosterEdit}
                onClick={handleToggleJuryPreferences}
                type="button"
              >
                <span className={`${styles.switchTrack} ${store.juryPreferencesEnabled ? styles.switchTrackOn : styles.switchTrackOff}`}>
                  <span className={styles.switchThumb} />
                </span>
              </button>
            </div>
          </div>
        </section>
        <section className={`${styles.card} ${styles.cardMuted}`}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Обложка</h3>
          </div>
          {isRosterEdit ? (
            <div className={styles.coverBox}>
              {store.coverPreviewUrl ? (
                <img alt="" className={styles.coverImg} src={resolveMediaUrl(store.coverPreviewUrl) ?? undefined} />
              ) : (
                <div className={styles.coverHint}>
                  <div className={styles.coverPlus}>+</div>
                  <div>1920 × 1080</div>
                </div>
              )}
            </div>
          ) : (
            <label className={styles.coverBox}>
              {store.coverPreviewUrl ? (
                <img alt="" className={styles.coverImg} src={resolveMediaUrl(store.coverPreviewUrl) ?? undefined} />
              ) : (
                <div className={styles.coverHint}>
                  <div className={styles.coverPlus}>+</div>
                  <div>1920 × 1080</div>
                </div>
              )}
              <input accept="image/*" className={styles.hidden} onChange={onCoverPick} type="file" />
            </label>
          )}
        </section>
      </div>

      <section className={`${styles.card} ${styles.cardMuted} ${styles.criteriaPanel}`}>
        <div className={styles.criteriaPanelBoundariesHeader}>
          <h3 className={styles.criteriaPanelBoundariesTitle}>Границы</h3>
        </div>
        <div className={styles.criteriaPanelBoundariesRow}>
          <div className={styles.criteriaPanelBoundaryCell}>
            <input
              aria-label="Нижняя граница оценки"
              className={styles.criteriaPanelBoundaryInput}
              inputMode="numeric"
              onBlur={isRosterEdit ? undefined : commitBoundaryInputs}
              onChange={(e) => setBoundaryMinStr(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
              }}
              readOnly={isRosterEdit}
              type="text"
              value={boundaryMinStr}
            />
          </div>
          <div className={styles.criteriaPanelBoundaryCell}>
            <input
              aria-label="Верхняя граница оценки"
              className={styles.criteriaPanelBoundaryInput}
              inputMode="numeric"
              onBlur={isRosterEdit ? undefined : commitBoundaryInputs}
              onChange={(e) => setBoundaryMaxStr(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
              }}
              readOnly={isRosterEdit}
              type="text"
              value={boundaryMaxStr}
            />
          </div>
        </div>
        <div className={styles.criteriaPanelIntro}>
          <h3 className={styles.criteriaPanelIntroTitle}>Показатели оценивания</h3>
          {!isRosterEdit ? (
            <p className={styles.criteriaPanelIntroSubtitle}>
              Укажите показатели с учетом их значимости
              {store.useCriteriaWeights && store.criteria.length >= 2
                ? ' Порядок сверху вниз задаёт приоритет при расчёте — перетаскивайте белую плашку с названием.'
                : ''}
            </p>
          ) : null}
        </div>
        <div className={styles.criteriaPanelList}>
          {store.criteria.map((c, index) => (
            <div
              className={`${styles.criteriaPanelCriterionRow} ${
                canReorderCriteria && criterionDragOver === index && criterionDragFrom !== index
                  ? styles.criteriaPanelCriterionRowDragOver
                  : ''
              } ${canReorderCriteria && criterionDragFrom === index ? styles.criteriaPanelCriterionRowDragging : ''}`}
              key={c.localId}
              onDragOver={(e) => {
                if (!canReorderCriteria || criterionDragFrom === null) return
                e.preventDefault()
                e.dataTransfer.dropEffect = 'move'
                setCriterionDragOver(index)
              }}
              onDrop={(e) => {
                if (!canReorderCriteria) return
                e.preventDefault()
                const raw = e.dataTransfer.getData('text/plain')
                const from = Number.parseInt(raw, 10)
                if (Number.isNaN(from) || from === index) {
                  setCriterionDragFrom(null)
                  setCriterionDragOver(null)
                  return
                }
                store.moveCriterion(from, index)
                setCriterionDragFrom(null)
                setCriterionDragOver(null)
              }}
            >
              <div className={styles.criteriaPanelOrderBadge}>{index + 1}</div>
              <div
                aria-grabbed={canReorderCriteria && criterionDragFrom === index ? true : undefined}
                className={`${styles.criteriaPanelNameShell} ${
                  canReorderCriteria ? styles.criteriaPanelNameShellDraggable : ''
                }`}
                draggable={canReorderCriteria}
                onDragEnd={() => {
                  setCriterionDragFrom(null)
                  setCriterionDragOver(null)
                }}
                onDragStart={(e) => {
                  if (!canReorderCriteria) return
                  const t = e.target as HTMLElement
                  if (t.closest('button')) {
                    e.preventDefault()
                    return
                  }
                  e.dataTransfer.setData('text/plain', String(index))
                  e.dataTransfer.effectAllowed = 'move'
                  setCriterionDragFrom(index)
                }}
                title={canReorderCriteria ? 'Перетащите плашку, чтобы изменить порядок значимости' : undefined}
              >
                <input
                  className={styles.criteriaPanelNameInput}
                  draggable={false}
                  onChange={(e) => store.updateCriterion(c.localId, { name: e.target.value })}
                  placeholder="Название показателя"
                  readOnly={isRosterEdit}
                  type="text"
                  value={c.name}
                />
                {!isRosterEdit ? (
                  <button
                    aria-label="Удалить критерий"
                    className={styles.criteriaPanelDeleteControl}
                    draggable={false}
                    onClick={() => store.removeCriterion(c.localId)}
                    type="button"
                  >
                    <span className={styles.criteriaPanelDeleteIcon} aria-hidden />
                  </button>
                ) : null}
              </div>
            </div>
          ))}
          {store.criteria.length >= 2
            ? store.criteriaInequalities.map((operator, operatorIndex) => (
                <div className={styles.criteriaPanelInequalityRow} key={`criterion-inequality-${operatorIndex}`}>
                  <span className={styles.criteriaPanelInequalityLabel}>
                    Связь между {operatorIndex + 1} и {operatorIndex + 2}
                  </span>
                  <select
                    aria-label={`Неравенство между показателями ${operatorIndex + 1} и ${operatorIndex + 2}`}
                    className={styles.criteriaPanelInequalitySelect}
                    disabled={isRosterEdit}
                    onChange={(event) => {
                      const nextOperator = event.target.value as 'gt' | 'eq' | 'gte'
                      store.setCriteriaInequality(operatorIndex, nextOperator)
                    }}
                    value={operator}
                  >
                    {CRITERIA_INEQUALITY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))
            : null}
          {!isRosterEdit ? (
          <div className={styles.criteriaPanelAddCriterionRow}>
            <div className={styles.criteriaPanelOrderBadge}>
              <span className={styles.criteriaPanelTemplateBadgeDigit}>{store.criteria.length + 1}</span>
            </div>
            <div className={styles.criteriaPanelNameShellMuted}>
              <input
                aria-label={`Название нового показателя ${store.criteria.length + 1}`}
                className={styles.criteriaPanelNameInput}
                onChange={(e) => setNewCriterionDraftName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return
                  const trimmed = (e.target as HTMLInputElement).value.trim()
                  if (!trimmed) return
                  e.preventDefault()
                  const bounds = getClampedBoundsFromStrings(boundaryMinStr, boundaryMaxStr, 1, 10)
                  store.addCriterion(trimmed, store.criteria.length === 0 ? bounds : undefined)
                  setNewCriterionDraftName('')
                }}
                placeholder={`Добавить показатель ${store.criteria.length + 1}`}
                type="text"
                value={newCriterionDraftName}
              />
              <button
                aria-label="Подтвердить и добавить показатель"
                className={styles.criteriaPanelAddTickBtn}
                disabled={!newCriterionDraftName.trim()}
                onClick={() => {
                  const trimmed = newCriterionDraftName.trim()
                  if (!trimmed) return
                  const bounds = getClampedBoundsFromStrings(boundaryMinStr, boundaryMaxStr, 1, 10)
                  store.addCriterion(trimmed, store.criteria.length === 0 ? bounds : undefined)
                  setNewCriterionDraftName('')
                }}
                type="button"
              >
                <img
                  alt=""
                  className={styles.criteriaPanelRowIcon}
                  src={
                    newCriterionDraftName.trim()
                      ? '/card-tick-circle-active.svg'
                      : '/card-tick-circle.svg'
                  }
                />
              </button>
            </div>
          </div>
          ) : null}
        </div>
      </section>

      <div className={styles.listsRow}>
        <section className={styles.listBlock}>
          <div className={styles.listBlockHeader}>
            <h3 className={styles.listBlockTitle}>Участники</h3>
            <button
              className={styles.listBlockAdd}
              onClick={openNewParticipant}
              type="button"
              aria-label="Добавить участника"
            >
              <img alt="" className={styles.listBlockAddIcon} src="/nav/nav-add-circle.svg" />
            </button>
          </div>
          <div className={styles.listBlockBody}>
            {activeParticipants.length === 0 ? (
              <div className={styles.listBlockEmpty}>Нет участников</div>
            ) : (
              <div className={styles.listBlockScroll}>
                {activeParticipants.map((participant, participantIndex) => (
                  <div
                    className={`${styles.personRow} ${
                      participantDragOver === participantIndex && participantDragFrom !== participantIndex
                        ? styles.personRowDragOver
                        : ''
                    } ${participantDragFrom === participantIndex ? styles.personRowDragging : ''}`}
                    draggable={activeParticipants.length >= 2}
                    key={participant.localId}
                    onDragEnd={() => {
                      setParticipantDragFrom(null)
                      setParticipantDragOver(null)
                    }}
                    onDragOver={(event) => {
                      if (participantDragFrom === null) return
                      event.preventDefault()
                      event.dataTransfer.dropEffect = 'move'
                      setParticipantDragOver(participantIndex)
                    }}
                    onDragStart={(event) => {
                      const dragTargetElement = event.target as HTMLElement
                      if (dragTargetElement.closest('button')) {
                        event.preventDefault()
                        return
                      }
                      event.dataTransfer.setData('text/plain', String(participantIndex))
                      event.dataTransfer.effectAllowed = 'move'
                      setParticipantDragFrom(participantIndex)
                    }}
                    onDrop={(event) => {
                      event.preventDefault()
                      const fromIndexRaw = event.dataTransfer.getData('text/plain')
                      const fromIndex = Number.parseInt(fromIndexRaw, 10)

                      if (Number.isNaN(fromIndex) || fromIndex === participantIndex) {
                        setParticipantDragFrom(null)
                        setParticipantDragOver(null)
                        return
                      }

                      moveActiveParticipant(fromIndex, participantIndex)
                      setParticipantDragFrom(null)
                      setParticipantDragOver(null)
                    }}
                    title={activeParticipants.length >= 2 ? 'Перетащите строку, чтобы изменить порядок участников' : undefined}
                  >
                    {participant.previewUrl ? (
                      <img alt="" className={styles.avatarSm} src={resolveMediaUrl(participant.previewUrl) ?? undefined} />
                    ) : (
                      <div className={styles.avatarSm} />
                    )}
                    <div className={styles.personMeta}>
                      <p className={styles.personName}>{participant.fullName || 'Без имени'}</p>
                      <p className={styles.personSub}>
                        {participant.extraInfo?.trim() ? participant.extraInfo.trim() : '—'} · {participant.country || '—'}
                      </p>
                    </div>
                    <div className={styles.personRowActions}>
                      {!isRosterEdit ? (
                        <button
                          className={styles.personEditBtn}
                          onClick={() => openEditParticipant(participant)}
                          type="button"
                          aria-label="Изменить"
                        >
                          <img alt="" className={styles.personEditIcon} src="/card-edit.svg" width={24} height={24} />
                        </button>
                      ) : null}
                      <div className={styles.personDeleteWrap}>
                        <button
                          className={styles.personDeleteStripe}
                          onClick={() => removeActiveParticipant(participant.localId)}
                          type="button"
                          aria-label="Удалить"
                        >
                          <svg className={styles.personDeleteX} width="24" height="24" viewBox="0 0 24 24" aria-hidden>
                            <path
                              d="M7 7L17 17M17 7L7 17"
                              stroke="white"
                              strokeWidth="2"
                              strokeLinecap="round"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className={styles.listBlock}>
          <div className={styles.listBlockHeader}>
            <h3 className={styles.listBlockTitle}>Жюри</h3>
            <button className={styles.listBlockAdd} onClick={openNewJury} type="button" aria-label="Добавить жюри">
              <img alt="" className={styles.listBlockAddIcon} src="/nav/nav-add-circle.svg" />
            </button>
          </div>
          <div className={styles.listBlockBody}>
            {activeJury.length === 0 ? (
              <div className={styles.listBlockEmpty}>Нет жюри</div>
            ) : (
              <div className={styles.listBlockScroll}>
                {activeJury.map((j) => (
                  <div className={styles.personRow} key={j.localId}>
                    {j.previewUrl ? (
                      <img alt="" className={styles.avatarSm} src={resolveMediaUrl(j.previewUrl) ?? undefined} />
                    ) : (
                      <div className={styles.avatarSm} />
                    )}
                    <div className={styles.personMeta}>
                      <p className={styles.personName}>{j.fullName || 'Без имени'}</p>
                      <p className={styles.personSub}>{j.phone ? formatRuPhoneMask(j.phone) : '—'}</p>
                    </div>
                    <div className={styles.personRowActions}>
                      {!isRosterEdit ? (
                        <button className={styles.personEditBtn} onClick={() => openEditJury(j)} type="button" aria-label="Изменить">
                          <img alt="" className={styles.personEditIcon} src="/card-edit.svg" width={24} height={24} />
                        </button>
                      ) : null}
                      <div className={styles.personDeleteWrap}>
                        <button
                          className={styles.personDeleteStripe}
                          onClick={() => removeActiveJuryMember(j.localId)}
                          type="button"
                          aria-label="Удалить"
                        >
                          <svg className={styles.personDeleteX} width="24" height="24" viewBox="0 0 24 24" aria-hidden>
                            <path
                              d="M7 7L17 17M17 7L7 17"
                              stroke="white"
                              strokeWidth="2"
                              strokeLinecap="round"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {isRosterEdit && rosterStore.errorMessage ? <p className={styles.error}>{rosterStore.errorMessage}</p> : null}
      {!isRosterEdit && store.submitError ? <p className={styles.error}>{store.submitError}</p> : null}
      {!isRosterEdit && store.templateMessage ? (
        <p className={store.templateMessage.includes('Ошибка') ? styles.error : styles.success}>{store.templateMessage}</p>
      ) : null}

      {isRosterEdit ? (
        <div className={styles.footerBarEdit}>
          <button
            className={styles.footerBarEditBack}
            type="button"
            aria-label="Назад к списку мероприятий"
            onClick={handleRosterBack}
          >
            <img src="/exit-arrow-edit-template.svg" alt="" width={48} height={48} />
          </button>
          <button
            className={`${styles.btnPrimary} ${styles.btnEditFooter}`}
            disabled={rosterStore.isSaving}
            onClick={() => void handleRosterSave()}
            type="button"
          >
            {rosterStore.isSaving ? 'Сохранение…' : 'Сохранить изменения'}
          </button>
        </div>
      ) : isEditMode ? (
        <div className={styles.footerBarEdit}>
          <button
            className={styles.footerBarEditBack}
            type="button"
            aria-label="Назад к списку шаблонов"
            onClick={handleEditBack}
          >
            <img src="/exit-arrow-edit-template.svg" alt="" width={48} height={48} />
          </button>
          <div className={styles.footerBarEditActions}>
            <button
              className={`${styles.btnSecondary} ${styles.btnEditFooter}`}
              disabled={store.isSavingTemplate}
              onClick={() => runWithUnsavedCriterionGuard('saveAsNew')}
              type="button"
            >
              Сохранить как новый шаблон
            </button>
            <button
              className={`${styles.btnSecondary} ${styles.btnEditFooter}`}
              disabled={store.isSubmitting}
              onClick={() => runWithUnsavedCriterionGuard('createContest')}
              type="button"
            >
              Создать конкурс
            </button>
            <button
              className={`${styles.btnPrimary} ${styles.btnEditFooter}`}
              disabled={store.isUpdatingTemplate}
              onClick={() => runWithUnsavedCriterionGuard('saveChanges')}
              type="button"
            >
              {store.isUpdatingTemplate ? 'Сохранение…' : 'Сохранить изменения'}
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.footerBar}>
          <button className={styles.btnDanger} onClick={() => navigate('/cabinet/constructor')} type="button">
            Удалить
          </button>
          <button
            className={styles.btnSecondary}
            disabled={store.isSavingTemplate}
            onClick={() => runWithUnsavedCriterionGuard('saveTemplate')}
            type="button"
          >
            Сохранить как шаблон
          </button>
          <button
            className={styles.btnPrimary}
            disabled={store.isSubmitting}
            onClick={() => runWithUnsavedCriterionGuard('create')}
            type="button"
          >
            {store.isSubmitting ? 'Создание…' : 'Создать'}
          </button>
        </div>
      )}

      {isExitRosterConfirmOpen ? (
        <ConfirmDialog
          title="Вы точно хотите выйти без сохранения?"
          subtitle="Изменения состава мероприятия не сохранятся"
          acceptLabel="Выйти без сохранения"
          stayLabel="Остаться"
          onAccept={() => {
            setIsExitRosterConfirmOpen(false)
            navigate('/cabinet/events')
          }}
          onStay={() => setIsExitRosterConfirmOpen(false)}
        />
      ) : null}

      {isExitEditConfirmOpen ? (
        <ConfirmDialog
          title="Вы точно хотите выйти из редактирования шаблона?"
          subtitle="Изменения в шаблоне не сохранятся"
          acceptLabel="Выйти без сохранения"
          stayLabel="Остаться"
          onAccept={onConfirmExitEdit}
          onStay={() => setIsExitEditConfirmOpen(false)}
        />
      ) : null}

      {isCreateContestConfirmOpen ? (
        <ConfirmDialog
          title="Вы не сохранили изменения в шаблоне"
          subtitle="Перейти в создание мероприятия без сохранения?"
          acceptLabel="Создать"
          stayLabel="Сохранить и создать"
          onAccept={onConfirmCreateContestWithoutSave}
          onStay={onConfirmSaveAndCreateContest}
          isStayDisabled={store.isUpdatingTemplate}
        />
      ) : null}

      {isUnsavedCriterionConfirmOpen ? (
        <div className={styles.unsavedCriterionConfirmOverlay} onClick={onStayInConstructor}>
          <div className={styles.unsavedCriterionConfirmModal} onClick={(event) => event.stopPropagation()}>
            <div className={styles.unsavedCriterionConfirmBody}>
              <div className={styles.unsavedCriterionConfirmTextGroup}>
                <div className={styles.unsavedCriterionConfirmTitle}>Вы не сохранили показатель/критерий</div>
              </div>
              <div className={styles.unsavedCriterionConfirmActions}>
                <button
                  type="button"
                  className={styles.unsavedCriterionConfirmProceedButton}
                  onClick={onConfirmUnsafeAction}
                >
                  {getUnsafeCriterionProceedLabel()}
                </button>
                <button
                  type="button"
                  className={styles.unsavedCriterionConfirmStayButton}
                  onClick={onStayInConstructor}
                >
                  Остаться
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {participantModalOpen ? (
        <ParticipantProfileModal
          key={participantDraft ? participantDraft.localId : `new-${participantModalKey}`}
          initial={participantDraft}
          onClose={() => setParticipantModalOpen(false)}
          onSave={(draft) => {
            if (isRosterEdit) {
              rosterStore.addParticipant(draft)
              return
            }
            if (participantDraft) {
              store.updateParticipant(participantDraft.localId, draft)
            } else {
              store.addParticipant(draft)
            }
          }}
        />
      ) : null}
      {juryModalOpen ? (
        <JuryProfileModal
          key={juryDraft ? juryDraft.localId : `new-${juryModalKey}`}
          existingPhoneNumbers={activeJury
            .filter((juryMember) => juryMember.localId !== juryDraft?.localId)
            .map((juryMember) => juryMember.phone)}
          initial={juryDraft}
          onClose={() => setJuryModalOpen(false)}
          onSave={(draft) => {
            if (isRosterEdit) {
              rosterStore.addJuryMember(draft)
              return
            }
            if (juryDraft) {
              store.updateJuryMember(juryDraft.localId, draft)
            } else {
              store.addJuryMember(draft)
            }
          }}
        />
      ) : null}
    </div>
  )
})
