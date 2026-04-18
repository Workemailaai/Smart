import type { KeyboardEvent } from 'react'

/** Нормализация к +7XXXXXXXXXX (10 цифр после семёрки), как на сервере */
export function normalizePhoneDigits(input: string): string {
  let digits = String(input || '').replace(/\D/g, '')
  if (digits.length === 11 && digits.startsWith('8')) {
    digits = `7${digits.slice(1)}`
  }
  if (digits.length === 10) {
    digits = `7${digits}`
  }
  return digits.length ? `+${digits}` : ''
}

/** 10 цифр национальной части (без +7) */
export function phoneToNationalDigits(input: string): string {
  let d = String(input ?? '').replace(/\D/g, '')
  if (d.startsWith('8')) d = `7${d.slice(1)}`
  if (d.startsWith('7')) d = d.slice(1)
  return d.slice(0, 10)
}

/** Маска отображения: +7 (999) 656-86-85; не более 10 цифр после кода страны */
export function formatRuPhoneMask(input: string): string {
  const d = phoneToNationalDigits(input)

  if (d.length === 0) return '+7'

  const a = d.slice(0, 3)
  const b = d.slice(3, 6)
  const c = d.slice(6, 8)
  const e = d.slice(8, 10)

  if (d.length <= 3) {
    if (d.length < 3) return `+7 (${a}`
    /* Без пробела после «)» — иначе Backspace съедает пробел, а не цифры */
    return `+7 (${a})`
  }
  if (d.length <= 6) return `+7 (${a}) ${b}`
  if (d.length <= 8) return `+7 (${a}) ${b}-${c}`
  return `+7 (${a}) ${b}-${c}-${e}`
}

/**
 * Backspace в конце поля удаляет последнюю цифру, а не скобку/дефис.
 * Иначе после стирания «)» маска снова подставляет «(999)», пока цифры не убраны.
 */
export function ruPhoneMaskOnKeyDown(
  e: KeyboardEvent<HTMLInputElement>,
  currentMasked: string,
  setMasked: (v: string) => void,
): void {
  if (e.key !== 'Backspace') return
  const el = e.currentTarget
  const start = el.selectionStart ?? 0
  const end = el.selectionEnd ?? 0
  if (start !== end) return
  const nat = phoneToNationalDigits(currentMasked)
  if (nat.length === 0) {
    e.preventDefault()
    return
  }
  if (start !== el.value.length) return
  e.preventDefault()
  setMasked(formatRuPhoneMask(nat.slice(0, -1)))
}

/** Полный российский мобильный в формате после normalizePhoneDigits */
export function isCompleteRuPhone(input: string): boolean {
  return /^\+7\d{10}$/.test(normalizePhoneDigits(input))
}
