import { type PointerEvent as ReactPointerEvent, type ReactNode, type RefObject, useEffect, useMemo, useRef, useState } from 'react'
import styles from './BottomSheet.module.css'

type BottomSheetProps = {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  contentClassName?: string
  closeThreshold?: number
  contentRef?: RefObject<HTMLDivElement | null>
}

export function BottomSheet({
  isOpen,
  onClose,
  children,
  contentClassName,
  closeThreshold = 120,
  contentRef,
}: BottomSheetProps) {
  const [offsetY, setOffsetY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const pointerIdRef = useRef<number | null>(null)
  const dragStartYRef = useRef(0)
  const dragStartTimeRef = useRef(0)

  useEffect(() => {
    if (!isOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) {
      setOffsetY(0)
      setIsDragging(false)
      pointerIdRef.current = null
    }
  }, [isOpen])

  const onHandlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    pointerIdRef.current = event.pointerId
    dragStartYRef.current = event.clientY
    dragStartTimeRef.current = performance.now()
    setIsDragging(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onHandlePointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!isDragging || pointerIdRef.current !== event.pointerId) return
    const nextOffsetY = Math.max(0, event.clientY - dragStartYRef.current)
    setOffsetY(nextOffsetY)
  }

  const onHandlePointerEnd = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (pointerIdRef.current !== event.pointerId) return
    const dragDistance = Math.max(0, event.clientY - dragStartYRef.current)
    const dragDuration = Math.max(1, performance.now() - dragStartTimeRef.current)
    const dragVelocity = dragDistance / dragDuration

    pointerIdRef.current = null
    setIsDragging(false)

    if (dragDistance > closeThreshold || dragVelocity > 0.8) {
      onClose()
      return
    }
    setOffsetY(0)
  }

  const sheetStyle = useMemo(
    () => ({
      transform: `translateY(${offsetY}px)`,
    }),
    [offsetY],
  )

  if (!isOpen) return null

  return (
    <div className={styles.overlay}>
      <div className={styles.backdrop} onClick={onClose} />
      <section className={`${styles.sheet} ${isDragging ? styles.sheetDragging : ''}`} style={sheetStyle}>
        <button
          aria-label="Потяните вниз для закрытия"
          className={styles.handleButton}
          type="button"
          onPointerDown={onHandlePointerDown}
          onPointerMove={onHandlePointerMove}
          onPointerUp={onHandlePointerEnd}
          onPointerCancel={onHandlePointerEnd}
        >
          <span aria-hidden className={styles.handle} />
        </button>
        <div ref={contentRef} className={`${styles.content} ${contentClassName ?? ''}`}>
          {children}
        </div>
      </section>
    </div>
  )
}
