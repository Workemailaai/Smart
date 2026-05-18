import { makeAutoObservable } from 'mobx'
import type { DraftJury, DraftParticipant } from '@/features/event-constructor/model/createEventFormStore'
import { normalizePhoneDigits } from '@/shared/lib/ruPhone'
import type { IOrganizerContestView } from '@/entities/contest'

export type RosterDraftParticipant = DraftParticipant & {
  databaseId?: number
}

export type RosterDraftJury = DraftJury & {
  databaseId?: number
}

function newLocalId() {
  const browserCrypto = globalThis.crypto
  if (browserCrypto?.randomUUID) return browserCrypto.randomUUID()
  return `local-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

type RosterBaseline = {
  participantSlots: Array<{ participantId?: number; clientKey?: string }>
  juryIds: number[]
  hasNewFiles: boolean
}

class ContestRosterEditStore {
  contestId: number | null = null
  contestTitle = ''
  contestType = ''
  contestTypeLabel = ''
  useCriteriaWeights = false
  juryPreferencesEnabled = false
  participants: RosterDraftParticipant[] = []
  jury: RosterDraftJury[] = []
  initialParticipantIds: number[] = []
  initialJuryIds: number[] = []
  editBaselineJson: string | null = null
  isSaving = false
  errorMessage: string | null = null

  constructor() {
    makeAutoObservable(this)
  }

  reset() {
    this.contestId = null
    this.contestTitle = ''
    this.contestType = ''
    this.contestTypeLabel = ''
    this.useCriteriaWeights = false
    this.juryPreferencesEnabled = false
    this.participants = []
    this.jury = []
    this.initialParticipantIds = []
    this.initialJuryIds = []
    this.editBaselineJson = null
    this.isSaving = false
    this.errorMessage = null
  }

  captureBaseline(): string {
    const baseline: RosterBaseline = {
      participantSlots: this.participants.map((participant) =>
        participant.databaseId
          ? { participantId: participant.databaseId }
          : { clientKey: participant.localId },
      ),
      juryIds: this.jury.map((juryMember) => juryMember.databaseId).filter((id): id is number => Boolean(id)),
      hasNewFiles: Boolean(
        this.participants.some((participant) => participant.file) || this.jury.some((juryMember) => juryMember.file),
      ),
    }
    return JSON.stringify(baseline)
  }

  commitBaseline() {
    this.editBaselineJson = this.captureBaseline()
  }

  isDirty(): boolean {
    if (!this.editBaselineJson) return false
    return this.captureBaseline() !== this.editBaselineJson
  }

  loadFromOrganizerView(view: IOrganizerContestView, contestTypeLabel: string) {
    this.contestId = view.contest.id
    this.contestTitle = view.contest.title
    this.contestType = view.contest.contestType || ''
    this.contestTypeLabel = contestTypeLabel
    this.useCriteriaWeights = Boolean(view.contest.useCriteriaWeights)
    this.juryPreferencesEnabled = Boolean(view.contest.juryPreferencesEnabled)

    this.participants = view.participants.map((participant) => ({
      localId: newLocalId(),
      databaseId: participant.id,
      fullName: participant.fullName,
      extraInfo: participant.extraInfo || '',
      country: participant.country || '',
      file: null,
      previewUrl: participant.photoUrl || null,
    }))
    this.initialParticipantIds = this.participants.map((participant) => participant.databaseId!).filter(Boolean)

    const juryById = new Map<number, RosterDraftJury>()
    for (const participant of view.participants) {
      for (const juryCard of participant.juryCards) {
        if (juryById.has(juryCard.juryId)) continue
        juryById.set(juryCard.juryId, {
          localId: newLocalId(),
          databaseId: juryCard.juryId,
          fullName: juryCard.fullName,
          phone: normalizePhoneDigits(juryCard.phone),
          position: juryCard.position || '',
          password: '',
          file: null,
          previewUrl: juryCard.photoUrl || null,
        })
      }
    }
    this.jury = [...juryById.values()]
    this.initialJuryIds = this.jury.map((juryMember) => juryMember.databaseId!).filter(Boolean)
    this.commitBaseline()
  }

  addParticipant(draft: Omit<RosterDraftParticipant, 'localId' | 'databaseId'>) {
    this.participants.push({ ...draft, localId: newLocalId() })
  }

  removeParticipant(localId: string) {
    if (this.participants.length <= 1) return false
    const participant = this.participants.find((item) => item.localId === localId)
    if (participant?.previewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(participant.previewUrl)
    }
    this.participants = this.participants.filter((item) => item.localId !== localId)
    return true
  }

  moveParticipant(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex) return
    const count = this.participants.length
    if (fromIndex < 0 || toIndex < 0 || fromIndex >= count || toIndex >= count) return
    const next = [...this.participants]
    const [item] = next.splice(fromIndex, 1)
    next.splice(toIndex, 0, item)
    this.participants = next
  }

  addJuryMember(draft: Omit<RosterDraftJury, 'localId' | 'databaseId'>) {
    this.jury.push({ ...draft, localId: newLocalId() })
  }

  removeJuryMember(localId: string) {
    if (this.jury.length <= 1) return false
    const juryMember = this.jury.find((item) => item.localId === localId)
    if (juryMember?.previewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(juryMember.previewUrl)
    }
    this.jury = this.jury.filter((item) => item.localId !== localId)
    return true
  }

  validateForSave(): string | null {
    for (const participant of this.participants) {
      if (!participant.fullName.trim()) return 'У всех участников должно быть ФИО'
    }
    for (const juryMember of this.jury) {
      if (!juryMember.fullName.trim()) return 'У всех членов жюри укажите ФИО'
      if (!juryMember.databaseId) {
        const phone = normalizePhoneDigits(juryMember.phone)
        if (!/^\+7\d{10}$/.test(phone)) return 'Проверьте телефоны нового жюри (+7 и 10 цифр)'
        if (!juryMember.password || juryMember.password.length < 6) {
          return 'Пароль нового жюри не короче 6 символов'
        }
      }
    }
    const juryPhones = new Set<string>()
    for (const juryMember of this.jury) {
      const phone = normalizePhoneDigits(juryMember.phone)
      if (juryPhones.has(phone)) return 'В списке жюри телефон повторяется'
      juryPhones.add(phone)
    }
    return null
  }

  buildRosterFormData(): FormData {
    const currentParticipantIds = new Set(
      this.participants.map((participant) => participant.databaseId).filter((id): id is number => Boolean(id)),
    )
    const currentJuryIds = new Set(
      this.jury.map((juryMember) => juryMember.databaseId).filter((id): id is number => Boolean(id)),
    )

    const removedParticipantIds = this.initialParticipantIds.filter((id) => !currentParticipantIds.has(id))
    const removedJuryIds = this.initialJuryIds.filter((id) => !currentJuryIds.has(id))

    const addedParticipants = this.participants
      .filter((participant) => !participant.databaseId)
      .map((participant) => ({
        clientKey: participant.localId,
        fullName: participant.fullName.trim(),
        extraInfo: participant.extraInfo.trim() || null,
        country: participant.country.trim() || null,
      }))

    const addedJury = this.jury
      .filter((juryMember) => !juryMember.databaseId)
      .map((juryMember) => ({
        clientKey: juryMember.localId,
        fullName: juryMember.fullName.trim(),
        phone: normalizePhoneDigits(juryMember.phone),
        password: juryMember.password,
        position: juryMember.position.trim() || null,
      }))

    const participantSlots = this.participants.map((participant) =>
      participant.databaseId
        ? { participantId: participant.databaseId }
        : { clientKey: participant.localId },
    )

    const formData = new FormData()
    formData.append(
      'payload',
      JSON.stringify({
        participantSlots,
        participantOrder: this.participants
          .map((participant) => participant.databaseId)
          .filter((id): id is number => Boolean(id)),
        removedParticipantIds,
        removedJuryIds,
        addedParticipants,
        addedJury,
      }),
    )

    for (const participant of this.participants) {
      if (participant.file) {
        formData.append(`participantPhoto_${participant.localId}`, participant.file)
      }
    }
    for (const juryMember of this.jury) {
      if (juryMember.file) {
        formData.append(`juryPhoto_${juryMember.localId}`, juryMember.file)
      }
    }

    return formData
  }
}

export const contestRosterEditStore = new ContestRosterEditStore()
