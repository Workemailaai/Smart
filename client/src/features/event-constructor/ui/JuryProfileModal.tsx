import { useState } from 'react'
import type { DraftJury } from '../model/createEventFormStore'
import { formatRuPhoneMask, normalizePhoneDigits, ruPhoneMaskOnKeyDown } from '@/shared/lib/ruPhone'
import styles from './ProfileModal.module.css'

type JuryProfileModalProps = {
  initial: DraftJury | null
  onClose: () => void
  onSave: (draft: Omit<DraftJury, 'localId'>) => void
}

export function JuryProfileModal({ initial, onClose, onSave }: JuryProfileModalProps) {
  const [fullName, setFullName] = useState(() => initial?.fullName ?? '')
  const [phone, setPhone] = useState(() => formatRuPhoneMask(initial?.phone ?? ''))
  const [position, setPosition] = useState(() => initial?.position ?? '')
  const [password, setPassword] = useState(() => initial?.password ?? '')
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
    const nextPassword = password || initial?.password || ''
    onSave({
      fullName,
      phone: normalizePhoneDigits(phone),
      position,
      password: nextPassword,
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
        aria-labelledby="jury-modal-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 id="jury-modal-title" className={styles.title}>
          Профиль жюри
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
              onChange={(e) => setPosition(e.target.value)}
              placeholder="Должность"
              type="text"
              value={position}
            />
            <input
              className={styles.input}
              onChange={(e) => setPhone(formatRuPhoneMask(e.target.value))}
              onKeyDown={(e) => ruPhoneMaskOnKeyDown(e, phone, setPhone)}
              placeholder="+7 (999) 656-86-85"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              value={phone}
            />
            <input
              className={styles.input}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Пароль для входа в кабинет"
              type="password"
              autoComplete="new-password"
              value={password}
            />
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
