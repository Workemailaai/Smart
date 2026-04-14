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

  useEffect(() => {
    createEventFormStore.reset()
  }, [])

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
        <section className={`${styles.card} ${styles.cardMuted}`}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Общая информация</h3>
          </div>
          <div className={styles.field}>
            <input
              className={styles.input}
              id="evt-title"
              onChange={(e) => store.setTitle(e.target.value)}
              placeholder="Введите название мероприятия"
              type="text"
              value={store.title}
            />
          </div>
          <div className={styles.field}>
            <select
              className={styles.select}
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
          <div className={styles.field}>
            <textarea
              className={styles.textarea}
              id="evt-desc"
              onChange={(e) => store.setDescription(e.target.value)}
              placeholder="Краткое описание"
              value={store.description}
            />
          </div>
          {/* <div className={styles.descriptionBlock}>
            <div className={styles.descriptionRow}>
              <span>Значимость показателей</span>
              <span className={styles.descriptionValue}>Используется текущая логика оценки</span>
            </div>
            <div className={styles.descriptionRow}>
              <span>Учитывать предпочтения жюри</span>
              <span className={styles.descriptionValue}>Не влияет на формулу в текущей версии</span>
            </div>
          </div> */}
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

      {/* <section className={`${styles.card} ${styles.cardMuted}`}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>Границы</h3>
        </div>
        <div className={styles.boundaryRow}>
          <div className={styles.boundaryBox}>1</div>
          <div className={styles.boundaryBox}>{store.criteria[0]?.maxScore || 10}</div>
        </div>
      </section> */}

      <section className={`${styles.card} ${styles.cardMuted}`}>
        <h3 className={styles.cardTitle}>Показатели оценивания</h3>
        <p className={styles.boundHint}>Нижняя граница оценки по каждому критерию всегда 1; укажите верхнюю границу.</p>
        <div className={styles.criteriaList}>
          {store.criteria.map((c, index) => (
            <div className={styles.criterionRow} key={c.localId}>
              <div className={styles.criterionIndex}>{index + 1}</div>
              <input
                className={styles.input}
                onChange={(e) => store.updateCriterion(c.localId, { name: e.target.value })}
                placeholder="Название показателя"
                type="text"
                value={c.name}
              />
              <input
                className={`${styles.input} ${styles.maxScoreInput}`}
                min={1}
                onChange={(e) =>
                  store.updateCriterion(c.localId, { maxScore: Number(e.target.value) || 1 })
                }
                type="number"
                value={c.maxScore}
              />
              <button
                className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                onClick={() => store.removeCriterion(c.localId)}
                type="button"
                aria-label="Удалить критерий"
              >
                −
              </button>
            </div>
          ))}
        </div>
        <button className={styles.addRowBtn} onClick={() => store.addCriterion()} type="button">
          + показатель
        </button>
      </section>

      <div className={styles.listsGrid}>
        <section className={`${styles.card} ${styles.cardMuted}`}>
          <div className={styles.listHeader}>
            <h3 className={styles.listTitle}>Участники</h3>
            <button className={styles.addCircle} onClick={openNewParticipant} type="button" aria-label="Добавить участника">
              +
            </button>
          </div>
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
                  {p.age ? `${p.age} лет` : '—'} · {p.country || '—'}
                </p>
              </div>
              <div className={styles.rowActions}>
                <button className={styles.iconBtn} onClick={() => openEditParticipant(p)} type="button" aria-label="Изменить">
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
        </section>

        <section className={`${styles.card} ${styles.cardMuted}`}>
          <div className={styles.listHeader}>
            <h3 className={styles.listTitle}>Жюри</h3>
            <button className={styles.addCircle} onClick={openNewJury} type="button" aria-label="Добавить жюри">
              +
            </button>
          </div>
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
