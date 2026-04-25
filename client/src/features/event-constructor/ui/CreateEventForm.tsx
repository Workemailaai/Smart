import { observer } from 'mobx-react-lite'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { contestStore, createContestFull, getContestTypes } from '@/entities/contest'
import { createTemplate, getTemplateById, templateStore } from '@/entities/template'
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

export const CreateEventForm = observer(function CreateEventForm() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const store = createEventFormStore
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
  const [pendingUnsafeAction, setPendingUnsafeAction] = useState<'create' | 'saveTemplate' | null>(null)
  /** DnD: индекс перетаскиваемой строки и подсветка цели */
  const [criterionDragFrom, setCriterionDragFrom] = useState<number | null>(null)
  const [criterionDragOver, setCriterionDragOver] = useState<number | null>(null)

  useEffect(() => {
    createEventFormStore.reset()
  }, [])

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

  const canReorderCriteria = store.useCriteriaWeights && store.criteria.length >= 2

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

  useEffect(() => {
    const tid = searchParams.get('templateId')
    if (!tid) return
    const id = Number(tid)
    if (!Number.isFinite(id)) return
    void getTemplateById(id).then((res) => {
      if (res.data) store.applyTemplate(res.data)
    })
  }, [searchParams, store])

  const openNewParticipant = () => {
    setParticipantDraft(null)
    setParticipantModalKey((k) => k + 1)
    setParticipantModalOpen(true)
  }

  const openEditParticipant = (p: DraftParticipant) => {
    setParticipantDraft(p)
    setParticipantModalOpen(true)
  }

  const openNewJury = () => {
    setJuryDraft(null)
    setJuryModalKey((k) => k + 1)
    setJuryModalOpen(true)
  }

  const openEditJury = (j: DraftJury) => {
    setJuryDraft(j)
    setJuryModalOpen(true)
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

  const handleSaveTemplate = async () => {
    store.templateMessage = null
    const err = store.validate()
    if (err) {
      store.templateMessage = err
      return
    }
    const snapshot = store.getSnapshotForTemplate()
    if (snapshot.criteria.length === 0) {
      store.templateMessage = 'Добавьте критерии с названиями для шаблона'
      return
    }
    const name = window.prompt('Название шаблона')
    if (!name || !name.trim()) return
    store.isSavingTemplate = true
    try {
      const formData = new FormData()
      formData.append(
        'payload',
        JSON.stringify({
          name: name.trim(),
          contestType: snapshot.contestType,
          criteria: snapshot.criteria,
          snapshot,
        }),
      )
      if (store.coverFile) {
        formData.append('cover', store.coverFile)
      }
      store.participants.forEach((participant, index) => {
        if (participant.file) {
          formData.append(`participantPhoto_${index}`, participant.file)
        }
      })
      store.jury.forEach((juryMember, index) => {
        if (juryMember.file) {
          formData.append(`juryPhoto_${index}`, juryMember.file)
        }
      })
      await createTemplate(formData)
      store.templateMessage = 'Шаблон сохранён'
      void templateStore.fetchTemplates()
    } catch (e) {
      store.templateMessage = (e as Error)?.message || 'Ошибка сохранения шаблона'
    } finally {
      store.isSavingTemplate = false
    }
  }

  const hasUnsavedCriterionDraft = Boolean(newCriterionDraftName.trim())

  const runWithUnsavedCriterionGuard = (action: 'create' | 'saveTemplate') => {
    if (hasUnsavedCriterionDraft) {
      setPendingUnsafeAction(action)
      setIsUnsavedCriterionConfirmOpen(true)
      return
    }

    if (action === 'create') {
      void handleCreate()
      return
    }

    void handleSaveTemplate()
  }

  const onConfirmUnsafeAction = () => {
    if (pendingUnsafeAction === 'create') {
      void handleCreate()
    } else if (pendingUnsafeAction === 'saveTemplate') {
      void handleSaveTemplate()
    }
    setIsUnsavedCriterionConfirmOpen(false)
    setPendingUnsafeAction(null)
  }

  const onStayInConstructor = () => {
    setIsUnsavedCriterionConfirmOpen(false)
    setPendingUnsafeAction(null)
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
              <span className={styles.toggleLabel}>Значимость показателей</span>
              <button
                aria-label="Переключить значимость показателей"
                aria-pressed={store.useCriteriaWeights}
                className={styles.switchButton}
                data-property-1={store.useCriteriaWeights ? 'Active' : 'Inactive'}
                onClick={handleToggleCriteriaWeights}
                type="button"
              >
                <span className={`${styles.switchTrack} ${store.useCriteriaWeights ? styles.switchTrackOn : styles.switchTrackOff}`}>
                  <span className={styles.switchThumb} />
                </span>
              </button>
            </div>
            <div className={styles.toggleRow}>
              <span className={styles.toggleLabel}>Учитывать предпочтения жюри</span>
              <button
                aria-label="Переключить учет предпочтений жюри"
                aria-pressed={store.juryPreferencesEnabled}
                className={styles.switchButton}
                data-property-1={store.juryPreferencesEnabled ? 'Active' : 'Inactive'}
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
              onBlur={commitBoundaryInputs}
              onChange={(e) => setBoundaryMinStr(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
              }}
              type="text"
              value={boundaryMinStr}
            />
          </div>
          <div className={styles.criteriaPanelBoundaryCell}>
            <input
              aria-label="Верхняя граница оценки"
              className={styles.criteriaPanelBoundaryInput}
              inputMode="numeric"
              onBlur={commitBoundaryInputs}
              onChange={(e) => setBoundaryMaxStr(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
              }}
              type="text"
              value={boundaryMaxStr}
            />
          </div>
        </div>
        <div className={styles.criteriaPanelIntro}>
          <h3 className={styles.criteriaPanelIntroTitle}>Показатели оценивания</h3>
          <p className={styles.criteriaPanelIntroSubtitle}>
            Укажите показатели с учетом их значимости
            {store.useCriteriaWeights && store.criteria.length >= 2
              ? ' Порядок сверху вниз задаёт приоритет при расчёте — перетаскивайте белую плашку с названием.'
              : ''}
          </p>
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
                  type="text"
                  value={c.name}
                />
                <button
                  aria-label="Удалить критерий"
                  className={styles.criteriaPanelDeleteControl}
                  draggable={false}
                  onClick={() => store.removeCriterion(c.localId)}
                  type="button"
                >
                  <span className={styles.criteriaPanelDeleteIcon} aria-hidden />
                </button>
              </div>
            </div>
          ))}
          {/* Строка добавления: имя вводится в поле, зелёная галка — только при непустом названии */}
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
            {store.participants.length === 0 ? (
              <div className={styles.listBlockEmpty}>Нет участников</div>
            ) : (
              <div className={styles.listBlockScroll}>
                {store.participants.map((p) => (
                  <div className={styles.personRow} key={p.localId}>
                    {p.previewUrl ? (
                      <img alt="" className={styles.avatarSm} src={resolveMediaUrl(p.previewUrl) ?? undefined} />
                    ) : (
                      <div className={styles.avatarSm} />
                    )}
                    <div className={styles.personMeta}>
                      <p className={styles.personName}>{p.fullName || 'Без имени'}</p>
                      <p className={styles.personSub}>
                        {p.extraInfo?.trim() ? p.extraInfo.trim() : '—'} · {p.country || '—'}
                      </p>
                    </div>
                    <div className={styles.personRowActions}>
                      <button
                        className={styles.personEditBtn}
                        onClick={() => openEditParticipant(p)}
                        type="button"
                        aria-label="Изменить"
                      >
                        <img alt="" className={styles.personEditIcon} src="/card-edit.svg" width={24} height={24} />
                      </button>
                      <div className={styles.personDeleteWrap}>
                        <button
                          className={styles.personDeleteStripe}
                          onClick={() => store.removeParticipant(p.localId)}
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
            {store.jury.length === 0 ? (
              <div className={styles.listBlockEmpty}>Нет жюри</div>
            ) : (
              <div className={styles.listBlockScroll}>
                {store.jury.map((j) => (
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
                      <button className={styles.personEditBtn} onClick={() => openEditJury(j)} type="button" aria-label="Изменить">
                        <img alt="" className={styles.personEditIcon} src="/card-edit.svg" width={24} height={24} />
                      </button>
                      <div className={styles.personDeleteWrap}>
                        <button
                          className={styles.personDeleteStripe}
                          onClick={() => store.removeJuryMember(j.localId)}
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

      {store.submitError ? <p className={styles.error}>{store.submitError}</p> : null}
      {store.templateMessage ? <p className={store.templateMessage.includes('Ошибка') ? styles.error : styles.success}>{store.templateMessage}</p> : null}

      <div className={styles.footerBar}>
        <button className={styles.btnDanger} onClick={() => navigate('/cabinet/constructor')} type="button">
          Отмена
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
                  {pendingUnsafeAction === 'saveTemplate' ? 'Всё равно сохранить шаблон' : 'Всё равно создать мероприятие'}
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
          existingPhoneNumbers={store.jury
            .filter((juryMember) => juryMember.localId !== juryDraft?.localId)
            .map((juryMember) => juryMember.phone)}
          initial={juryDraft}
          onClose={() => setJuryModalOpen(false)}
          onSave={(draft) => {
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
