import { observer } from 'mobx-react-lite'
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { contestStore, createContestFull, getContestTypes } from '@/entities/contest'
import { createTemplate, getTemplateById, templateStore } from '@/entities/template'
import type { IContestTypeOption } from '@/entities/contest'
import { createEventFormStore, type DraftJury, type DraftParticipant } from '../model/createEventFormStore'
import { ParticipantProfileModal } from './ParticipantProfileModal'
import { JuryProfileModal } from './JuryProfileModal'
import styles from './CreateEventForm.module.css'

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
  const [isCriteriaWeightEnabled, setIsCriteriaWeightEnabled] = useState(true)
  const [isJuryPreferenceEnabled, setIsJuryPreferenceEnabled] = useState(true)
  /** Строковое состояние полей границ — чтобы можно было стереть ввод и набрать число заново */
  const [boundaryMinStr, setBoundaryMinStr] = useState(() =>
    String(store.criteria[0]?.minScore ?? 1),
  )
  const [boundaryMaxStr, setBoundaryMaxStr] = useState(() =>
    String(store.criteria[0]?.maxScore ?? 10),
  )

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

  const commitBoundaryInputs = () => {
    const c0 = store.criteria[0]
    const parsePart = (s: string, fallback: number) => {
      const t = s.trim()
      if (t === '') return fallback
      const n = Number(t)
      return Number.isFinite(n) ? Math.round(n) : fallback
    }
    const m = parsePart(boundaryMinStr, c0?.minScore ?? 0)
    const M = parsePart(boundaryMaxStr, c0?.maxScore ?? 10)
    syncAllCriteriaBounds(store, m, M)
    const c = store.criteria[0]
    if (c) {
      setBoundaryMinStr(String(c.minScore))
      setBoundaryMaxStr(String(c.maxScore))
    }
  }

  useEffect(() => {
    void getContestTypes().then((r) => {
      if (r.data?.length) setTypeOptions(r.data)
      else {
        setTypeOptions([
          { id: 'miss_world', label: 'Мисс мира' },
          { id: 'miss_universe', label: 'Мисс вселенная' },
        ])
      }
    })
  }, [])

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
    const sk = store.getSkeletonForTemplate()
    if (sk.criteria.length === 0) {
      store.templateMessage = 'Добавьте критерии с названиями для шаблона'
      return
    }
    const name = window.prompt('Название шаблона')
    if (!name || !name.trim()) return
    store.isSavingTemplate = true
    try {
      await createTemplate({
        name: name.trim(),
        contestType: sk.contestType,
        criteria: sk.criteria,
      })
      store.templateMessage = 'Шаблон сохранён'
      void templateStore.fetchTemplates()
    } catch (e) {
      store.templateMessage = (e as Error)?.message || 'Ошибка сохранения шаблона'
    } finally {
      store.isSavingTemplate = false
    }
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
                  {typeOptions.find((t) => t.id === store.contestType)?.label ?? ''}
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
                  {typeOptions.map((t) => (
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
                aria-pressed={isCriteriaWeightEnabled}
                className={styles.switchButton}
                data-property-1={isCriteriaWeightEnabled ? 'Active' : 'Inactive'}
                onClick={() => setIsCriteriaWeightEnabled((v) => !v)}
                type="button"
              >
                <span className={`${styles.switchTrack} ${isCriteriaWeightEnabled ? styles.switchTrackOn : styles.switchTrackOff}`}>
                  <span className={styles.switchThumb} />
                </span>
              </button>
            </div>
            <div className={styles.toggleRow}>
              <span className={styles.toggleLabel}>Учитывать предпочтения жюри</span>
              <button
                aria-label="Переключить учет предпочтений жюри"
                aria-pressed={isJuryPreferenceEnabled}
                className={styles.switchButton}
                data-property-1={isJuryPreferenceEnabled ? 'Active' : 'Inactive'}
                onClick={() => setIsJuryPreferenceEnabled((v) => !v)}
                type="button"
              >
                <span className={`${styles.switchTrack} ${isJuryPreferenceEnabled ? styles.switchTrackOn : styles.switchTrackOff}`}>
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
              <img alt="" className={styles.coverImg} src={store.coverPreviewUrl} />
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
          <p className={styles.criteriaPanelIntroSubtitle}>Укажите показатели с учетом их значимости</p>
        </div>
        <div className={styles.criteriaPanelList}>
          {store.criteria.map((c, index) => (
            <div className={styles.criteriaPanelCriterionRow} key={c.localId}>
              <div className={styles.criteriaPanelOrderBadge}>{index + 1}</div>
              <div className={styles.criteriaPanelNameShell}>
                <input
                  className={styles.criteriaPanelNameInput}
                  onChange={(e) => store.updateCriterion(c.localId, { name: e.target.value })}
                  placeholder="Название показателя"
                  type="text"
                  value={c.name}
                />
                {store.criteria.length > 1 ? (
                  <button
                    aria-label="Удалить критерий"
                    className={styles.criteriaPanelDeleteControl}
                    onClick={() => store.removeCriterion(c.localId)}
                    type="button"
                  >
                    <img alt="" className={styles.criteriaPanelRowIcon} src="/card-minus-cirlce.svg" />
                  </button>
                ) : (
                  <span className={styles.criteriaPanelDeleteControlSpacer} />
                )}
              </div>
            </div>
          ))}
          {/* Пустой шаблон всегда последний: добавляет новую строку критерия */}
          <button
            className={styles.criteriaPanelAddCriterionRow}
            onClick={() => store.addCriterion()}
            type="button"
          >
            <div className={styles.criteriaPanelOrderBadge}>
              <span className={styles.criteriaPanelTemplateBadgeDigit}>{store.criteria.length + 1}</span>
            </div>
            <div className={styles.criteriaPanelNameShellMuted}>
              <span className={styles.criteriaPanelAddCriterionHint}>
                Добавить показатель {store.criteria.length + 1}
              </span>
              <span aria-hidden className={styles.criteriaPanelTemplateTick}>
                <img alt="" className={styles.criteriaPanelRowIcon} src="/card-tick-circle.svg" />
              </span>
            </div>
          </button>
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
                      <img alt="" className={styles.avatarSm} src={p.previewUrl} />
                    ) : (
                      <div className={styles.avatarSm} />
                    )}
                    <div className={styles.personMeta}>
                      <p className={styles.personName}>{p.fullName || 'Без имени'}</p>
                      <p className={styles.personSub}>
                        {p.extraInfo?.trim() ? p.extraInfo.trim() : '—'} · {p.country || '—'}
                      </p>
                    </div>
                    <div className={styles.rowActions}>
                      <button
                        className={styles.iconBtn}
                        onClick={() => openEditParticipant(p)}
                        type="button"
                        aria-label="Изменить"
                      >
                        ✎
                      </button>
                      <button
                        className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                        onClick={() => store.removeParticipant(p.localId)}
                        type="button"
                        aria-label="Удалить"
                      >
                        🗑
                      </button>
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
                      <img alt="" className={styles.avatarSm} src={j.previewUrl} />
                    ) : (
                      <div className={styles.avatarSm} />
                    )}
                    <div className={styles.personMeta}>
                      <p className={styles.personName}>{j.fullName || 'Без имени'}</p>
                      <p className={styles.personSub}>{j.phone || '—'}</p>
                    </div>
                    <div className={styles.rowActions}>
                      <button className={styles.iconBtn} onClick={() => openEditJury(j)} type="button" aria-label="Изменить">
                        ✎
                      </button>
                      <button
                        className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                        onClick={() => store.removeJuryMember(j.localId)}
                        type="button"
                        aria-label="Удалить"
                      >
                        🗑
                      </button>
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
          onClick={() => void handleSaveTemplate()}
          type="button"
        >
          Сохранить как шаблон
        </button>
        <button
          className={styles.btnPrimary}
          disabled={store.isSubmitting}
          onClick={() => void handleCreate()}
          type="button"
        >
          {store.isSubmitting ? 'Создание…' : 'Создать'}
        </button>
      </div>

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
