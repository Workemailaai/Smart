import { useState } from 'react'
import type { DraftParticipant } from '../model/createEventFormStore'
import styles from './ProfileModal.module.css'

const COUNTRIES = [
  { code: 'Россия', label: 'Россия' },
  { code: 'Казахстан', label: 'Казахстан' },
  { code: 'Беларусь', label: 'Беларусь' },
  { code: 'Украина', label: 'Украина' },
  { code: 'Австралия', label: 'Австралия' },
  { code: 'США', label: 'США' },
  { code: 'Другая', label: 'Другая' },
]

type ParticipantProfileModalProps = {
  initial: DraftParticipant | null
  onClose: () => void
  onSave: (draft: Omit<DraftParticipant, 'localId'>) => void
}

export function ParticipantProfileModal({ initial, onClose, onSave }: ParticipantProfileModalProps) {
  const [fullName, setFullName] = useState(() => initial?.fullName ?? '')
  const [age, setAge] = useState(() => initial?.age ?? '')
  const [country, setCountry] = useState(() => initial?.country || 'Россия')
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(() => initial?.previewUrl ?? null)

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f || !f.type.startsWith('image/')) return
    if (previewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl)
    }
    setFile(f)
    setPreviewUrl(URL.createObjectURL(f))
  }

  const handleSave = () => {
    const nextFile = file ?? initial?.file ?? null
    const nextPreview = file ? previewUrl : initial?.previewUrl ?? null
    onSave({
      fullName,
      age,
      country,
      file: nextFile,
      previewUrl: nextPreview,
    })
    onClose()
  }

  return (
    <div className={styles.overlay} role="presentation" onMouseDown={onClose}>
      <div
        className={styles.modal}
        role="dialog"
        aria-labelledby="participant-modal-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 id="participant-modal-title" className={styles.title}>
          Профиль участника
        </h2>
        <div className={styles.body}>
          <label className={styles.upload}>
            {previewUrl ? (
              <img alt="" className={styles.previewImg} src={previewUrl} />
            ) : (
              <span className={styles.uploadInner}>
                <span className={styles.plus}>+</span>
                <span>Загрузить фото</span>
              </span>
            )}
            <input accept="image/*" className={styles.hiddenInput} onChange={onPickFile} type="file" />
          </label>
          <div className={styles.fields}>
            <input
              className={styles.input}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="ФИО"
              type="text"
              value={fullName}
            />
            <input
              className={styles.input}
              onChange={(e) => setAge(e.target.value)}
              placeholder="Возраст"
              type="number"
              min={1}
              value={age}
            />
            <select className={styles.input} onChange={(e) => setCountry(e.target.value)} value={country}>
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className={styles.footer}>
          <button className={styles.backBtn} onClick={onClose} type="button" aria-label="Назад">
            ←
          </button>
          <button className={styles.saveBtn} onClick={handleSave} type="button">
            Сохранить
          </button>
        </div>
      </div>
    </div>
  )
}
