import { makeAutoObservable, runInAction } from 'mobx'
import type { ITemplate } from '@/entities/template'
import { normalizeTemplateCriteria } from '@/entities/template'
import { normalizePhoneDigits } from '@/shared/lib/ruPhone'

export { normalizePhoneDigits } from '@/shared/lib/ruPhone'

function newLocalId() {
  const browserCrypto = globalThis.crypto

  if (browserCrypto?.randomUUID) {
    return browserCrypto.randomUUID()
  }

  if (browserCrypto?.getRandomValues) {
    const randomBytes = new Uint8Array(16)
    browserCrypto.getRandomValues(randomBytes)

    randomBytes[6] = (randomBytes[6] & 0x0f) | 0x40
    randomBytes[8] = (randomBytes[8] & 0x3f) | 0x80

    const bytesHex = Array.from(randomBytes, (byteValue) => byteValue.toString(16).padStart(2, '0')).join('')
    return `${bytesHex.slice(0, 8)}-${bytesHex.slice(8, 12)}-${bytesHex.slice(12, 16)}-${bytesHex.slice(16, 20)}-${bytesHex.slice(20)}`
  }

  return `local-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export type DraftCriterion = { localId: string; name: string; minScore: number; maxScore: number }

export type DraftParticipant = {
  localId: string
  fullName: string
  extraInfo: string
  country: string
  file: File | null
  previewUrl: string | null
}

export type DraftJury = {
  localId: string
  fullName: string
  phone: string
  position: string
  password: string
  file: File | null
  previewUrl: string | null
}

export type EventTemplateSnapshot = {
  title: string
  contestType: string
  coverImageUrl: string | null
  useCriteriaWeights: boolean
  juryPreferencesEnabled: boolean
  criteria: { name: string; minScore: number; maxScore: number }[]
  participants: { fullName: string; extraInfo: string | null; country: string | null; photoUrl: string | null }[]
  jury: { fullName: string; phone: string; position: string | null; password: string; photoUrl: string | null }[]
}

class CreateEventFormStore {
  title = ''
  description = ''
  contestType = 'creative'
  criteria: DraftCriterion[] = []
  participants: DraftParticipant[] = []
  jury: DraftJury[] = []
  coverFile: File | null = null
  coverPreviewUrl: string | null = null
  submitError: string | null = null
  isSubmitting = false
  templateMessage: string | null = null
  isSavingTemplate = false
  /** Учитывать значимость показателей (взвешенный расчёт на сервере) */
  useCriteriaWeights = false
  /** Учитывать предпочтения жюри (экран приоритетов + смена порядка показателей) */
  juryPreferencesEnabled = false

  constructor() {
    makeAutoObservable(this)
  }

  reset() {
    if (this.coverPreviewUrl) URL.revokeObjectURL(this.coverPreviewUrl)
    this.participants.forEach((p) => {
      if (p.previewUrl) URL.revokeObjectURL(p.previewUrl)
    })
    this.jury.forEach((j) => {
      if (j.previewUrl) URL.revokeObjectURL(j.previewUrl)
    })
    this.title = ''
    this.description = ''
    this.contestType = 'creative'
    this.criteria = []
    this.participants = []
    this.jury = []
    this.coverFile = null
    this.coverPreviewUrl = null
    this.submitError = null
    this.templateMessage = null
    this.useCriteriaWeights = false
    this.juryPreferencesEnabled = false
  }

  setUseCriteriaWeights(v: boolean) {
    this.useCriteriaWeights = v
  }

  setJuryPreferencesEnabled(v: boolean) {
    this.juryPreferencesEnabled = v
  }

  setTitle(v: string) {
    this.title = v
  }

  setDescription(v: string) {
    this.description = v
  }

  setContestType(v: string) {
    this.contestType = v
  }

  setCover(file: File | null) {
    runInAction(() => {
      if (this.coverPreviewUrl) URL.revokeObjectURL(this.coverPreviewUrl)
      this.coverFile = file
      this.coverPreviewUrl = file ? URL.createObjectURL(file) : null
    })
  }

  /**
   * Добавить критерий; имя обрезается по краям.
   * Для первого показателя можно передать границы из полей «Границы» формы.
   */
  addCriterion(initialName = '', bounds?: { minScore: number; maxScore: number }) {
    const name = initialName.trim()
    let minScore: number
    let maxScore: number
    if (this.criteria.length > 0) {
      minScore = this.criteria[0].minScore
      maxScore = this.criteria[0].maxScore
    } else if (bounds) {
      minScore = bounds.minScore
      maxScore = bounds.maxScore
    } else {
      minScore = 1
      maxScore = 10
    }
    this.criteria.push({ localId: newLocalId(), name, minScore, maxScore })
  }

  removeCriterion(localId: string) {
    this.criteria = this.criteria.filter((c) => c.localId !== localId)
  }

  /** Перестановка показателей (порядок = значимость при взвешенном расчёте) */
  moveCriterion(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex) return
    const n = this.criteria.length
    if (fromIndex < 0 || toIndex < 0 || fromIndex >= n || toIndex >= n) return
    const next = [...this.criteria]
    const [item] = next.splice(fromIndex, 1)
    next.splice(toIndex, 0, item)
    this.criteria = next
  }

  updateCriterion(
    localId: string,
    patch: Partial<Pick<DraftCriterion, 'name' | 'minScore' | 'maxScore'>>,
  ) {
    const c = this.criteria.find((x) => x.localId === localId)
    if (!c) return
    if (patch.name !== undefined) c.name = patch.name
    if (patch.minScore !== undefined) c.minScore = patch.minScore
    if (patch.maxScore !== undefined) c.maxScore = patch.maxScore
  }

  addParticipant(draft: Omit<DraftParticipant, 'localId'>) {
    this.participants.push({
      ...draft,
      localId: newLocalId(),
    })
  }

  updateParticipant(localId: string, draft: Omit<DraftParticipant, 'localId'>) {
    const idx = this.participants.findIndex((p) => p.localId === localId)
    if (idx === -1) return
    const prev = this.participants[idx]
    if (prev.previewUrl && prev.previewUrl !== draft.previewUrl) {
      URL.revokeObjectURL(prev.previewUrl)
    }
    this.participants[idx] = { ...draft, localId }
  }

  removeParticipant(localId: string) {
    const p = this.participants.find((x) => x.localId === localId)
    if (p?.previewUrl) URL.revokeObjectURL(p.previewUrl)
    this.participants = this.participants.filter((x) => x.localId !== localId)
  }

  moveParticipant(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex) return
    const participantsCount = this.participants.length
    if (fromIndex < 0 || toIndex < 0 || fromIndex >= participantsCount || toIndex >= participantsCount) return

    const reorderedParticipants = [...this.participants]
    const [movedParticipant] = reorderedParticipants.splice(fromIndex, 1)
    reorderedParticipants.splice(toIndex, 0, movedParticipant)
    this.participants = reorderedParticipants
  }

  addJuryMember(draft: Omit<DraftJury, 'localId'>) {
    this.jury.push({ ...draft, localId: newLocalId() })
  }

  updateJuryMember(localId: string, draft: Omit<DraftJury, 'localId'>) {
    const idx = this.jury.findIndex((j) => j.localId === localId)
    if (idx === -1) return
    const prev = this.jury[idx]
    if (prev.previewUrl && prev.previewUrl !== draft.previewUrl) {
      URL.revokeObjectURL(prev.previewUrl)
    }
    this.jury[idx] = { ...draft, localId }
  }

  removeJuryMember(localId: string) {
    const j = this.jury.find((x) => x.localId === localId)
    if (j?.previewUrl) URL.revokeObjectURL(j.previewUrl)
    this.jury = this.jury.filter((x) => x.localId !== localId)
  }

  applyTemplate(t: ITemplate) {
    const snapshot = t.snapshot
    if (this.coverPreviewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(this.coverPreviewUrl)
    }
    this.coverFile = null
    this.coverPreviewUrl = snapshot?.coverImageUrl || null
    this.title = snapshot?.title?.trim() || ''
    this.contestType = snapshot?.contestType || t.contestType || 'creative'
    this.useCriteriaWeights = Boolean(snapshot?.useCriteriaWeights)
    this.juryPreferencesEnabled = Boolean(snapshot?.juryPreferencesEnabled)
    const sourceCriteria = snapshot?.criteria ?? t.criteria
    const rows = normalizeTemplateCriteria(sourceCriteria).map((c) => ({
      localId: newLocalId(),
      name: c.name,
      minScore: c.minScore ?? 1,
      maxScore: c.maxScore,
    }))
    if (!rows.length) {
      this.criteria = []
    } else {
      /* Одни границы для всех показателей — выравниваем по первому критерию */
      const unifiedMin = rows[0].minScore
      const unifiedMax = rows[0].maxScore
      this.criteria = rows.map((r) => ({ ...r, minScore: unifiedMin, maxScore: unifiedMax }))
    }
    this.participants = (snapshot?.participants ?? []).map((participant) => ({
      localId: newLocalId(),
      fullName: String(participant.fullName || ''),
      extraInfo: String(participant.extraInfo || ''),
      country: String(participant.country || ''),
      file: null,
      previewUrl: participant.photoUrl || null,
    }))
    this.jury = (snapshot?.jury ?? []).map((juryMember) => ({
      localId: newLocalId(),
      fullName: String(juryMember.fullName || ''),
      phone: normalizePhoneDigits(String(juryMember.phone || '')),
      position: String(juryMember.position || ''),
      password: String(juryMember.password || ''),
      file: null,
      previewUrl: juryMember.photoUrl || null,
    }))
  }

  /** Валидация перед отправкой */
  validate(): string | null {
    if (!this.title.trim()) return 'Укажите название мероприятия'
    const filledCriteria = this.criteria.filter((c) => c.name.trim())
    if (filledCriteria.length === 0) return 'Добавьте хотя бы один критерий с названием'
    for (const c of filledCriteria) {
      const min = Math.round(Number(c.minScore))
      const max = Math.round(Number(c.maxScore))
      if (!Number.isFinite(min) || min < 0) return `Некорректная нижняя граница у критерия «${c.name}»`
      if (!Number.isFinite(max) || max < 1) return `Некорректная верхняя граница у критерия «${c.name}»`
      if (max <= min) return `У критерия «${c.name}» верхняя граница должна быть больше нижней`
    }
    for (const p of this.participants) {
      if (!p.fullName.trim()) return 'У всех участников должно быть ФИО'
    }
    for (const j of this.jury) {
      if (!j.fullName.trim()) return 'У всех членов жюри укажите ФИО'
      const ph = normalizePhoneDigits(j.phone)
      if (!/^\+7\d{10}$/.test(ph)) return 'Проверьте телефоны жюри (+7 и 10 цифр)'
      if (!j.password || j.password.length < 6) return 'Пароль жюри не короче 6 символов'
    }
    const juryPhones = new Set<string>()
    for (const j of this.jury) {
      const ph = normalizePhoneDigits(j.phone)
      if (juryPhones.has(ph)) return 'В списке жюри телефон повторяется'
      juryPhones.add(ph)
    }
    return null
  }

  buildFormData(): FormData {
    const filledCriteria = this.criteria.filter((c) => c.name.trim())
    const payload = {
      title: this.title.trim(),
      description: this.description.trim() || null,
      contestType: this.contestType,
      useCriteriaWeights: this.useCriteriaWeights,
      juryPreferencesEnabled: this.juryPreferencesEnabled,
      criteria: filledCriteria.map((c) => ({
        name: c.name.trim(),
        minScore: Math.round(Number(c.minScore)),
        maxScore: Math.round(Number(c.maxScore)),
      })),
      participants: this.participants.map((p) => ({
        fullName: p.fullName.trim(),
        extraInfo: p.extraInfo.trim() || null,
        country: p.country.trim() || null,
        photoUrl:
          !p.file && p.previewUrl && !p.previewUrl.startsWith('blob:')
            ? p.previewUrl
            : null,
      })),
      jury: this.jury.map((j) => ({
        fullName: j.fullName.trim(),
        phone: normalizePhoneDigits(j.phone),
        password: j.password,
        position: j.position.trim() || null,
        photoUrl:
          !j.file && j.previewUrl && !j.previewUrl.startsWith('blob:')
            ? j.previewUrl
            : null,
      })),
      coverImageUrl:
        !this.coverFile && this.coverPreviewUrl && !this.coverPreviewUrl.startsWith('blob:')
          ? this.coverPreviewUrl
          : null,
    }
    const fd = new FormData()
    fd.append('payload', JSON.stringify(payload))
    if (this.coverFile) fd.append('cover', this.coverFile)
    this.participants.forEach((p, i) => {
      if (p.file) fd.append(`participantPhoto_${i}`, p.file)
    })
    this.jury.forEach((j, i) => {
      if (j.file) fd.append(`juryPhoto_${i}`, j.file)
    })
    return fd
  }

  getSnapshotForTemplate(): EventTemplateSnapshot {
    const filledCriteria = this.criteria.filter((c) => c.name.trim())
    return {
      title: this.title.trim(),
      contestType: this.contestType,
      coverImageUrl: this.coverPreviewUrl && !this.coverPreviewUrl.startsWith('blob:') ? this.coverPreviewUrl : null,
      useCriteriaWeights: this.useCriteriaWeights,
      juryPreferencesEnabled: this.juryPreferencesEnabled,
      criteria: filledCriteria.map((c) => ({
        name: c.name.trim(),
        minScore: Math.round(Number(c.minScore)),
        maxScore: Math.round(Number(c.maxScore)),
      })),
      participants: this.participants.map((participant) => ({
        fullName: participant.fullName.trim(),
        extraInfo: participant.extraInfo.trim() || null,
        country: participant.country.trim() || null,
        photoUrl:
          !participant.file && participant.previewUrl && !participant.previewUrl.startsWith('blob:')
            ? participant.previewUrl
            : null,
      })),
      jury: this.jury.map((juryMember) => ({
        fullName: juryMember.fullName.trim(),
        phone: normalizePhoneDigits(juryMember.phone),
        position: juryMember.position.trim() || null,
        password: juryMember.password,
        photoUrl:
          !juryMember.file && juryMember.previewUrl && !juryMember.previewUrl.startsWith('blob:')
            ? juryMember.previewUrl
            : null,
      })),
    }
  }
}

export const createEventFormStore = new CreateEventFormStore()
