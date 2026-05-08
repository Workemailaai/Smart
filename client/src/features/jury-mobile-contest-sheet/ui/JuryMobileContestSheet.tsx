import { observer } from 'mobx-react-lite'
import { resolveMediaUrl } from '@/shared'
import { sortCriteriaRows } from '@/shared/lib/weightedScores'
import { BottomSheet } from '@/shared/ui/bottom-sheet/BottomSheet'
import type { JuryMobileContestSheetProps } from '../model/types'
import styles from './JuryMobileContestSheet.module.css'

const INEQUALITY_OPTIONS: Array<{ value: 'gt' | 'eq' | 'gte'; label: string }> = [
  { value: 'gt', label: '>' },
  { value: 'eq', label: '=' },
  { value: 'gte', label: '>=' },
]

export const JuryMobileContestSheet = observer(function JuryMobileContestSheet(props: JuryMobileContestSheetProps) {
  const {
    juryContestStore,
    commentLimit,
    horizontalSwipeThresholdPx,
    isOpen,
    isPriorityStepVisible,
    isScoringStepVisible,
    isScoreEditingLocked,
    isCompletedContest,
    canStartRevote,
    isMobilePriorityConfirmOpen,
    isMobileLeaveConfirmOpen,
    touchDragFrom,
    touchDragOver,
    prioritySheetContentReference,
    prioritySaveButtonReference,
    pendingScoreUpdateReference,
    scoreSliderPointerStateReference,
    onRequestClose,
    onPriorityContinue,
    onOpenPriorityConfirm,
    onClosePriorityConfirm,
    onCloseLeaveConfirm,
    onPriorityDragStart,
    onPriorityDragMove,
    onPriorityDragEnd,
    onPriorityDragCancel,
    getScoreByPointerPosition,
    scheduleDebouncedScoreUpdate,
    flushDebouncedScoreUpdate,
    onStartRevote,
    onSubmitScores,
    onOpenResults,
    onCloseSheetWithConfirm,
    getInitials,
    formatDate,
  } = props

  if (!isOpen) {
    return null
  }

  return (
    <BottomSheet
      isOpen
      onClose={onRequestClose}
      contentClassName={styles.juryPrioritySheetContent}
      contentRef={prioritySheetContentReference}
    >
      {juryContestStore.isLoading ? <p className={styles.helperText}>Загрузка мероприятия...</p> : null}
      {juryContestStore.error ? <p className={styles.errorText}>{juryContestStore.error}</p> : null}
      {isPriorityStepVisible && juryContestStore.view ? (
        <div className={styles.juryPriorityLayout}>
          <article className={styles.juryPriorityContestCard}>
            <p className={styles.juryPriorityContestDate}>
              {new Date(juryContestStore.view.contest.createdAt).toLocaleDateString('ru-RU')}
            </p>
            <p className={styles.juryPriorityContestTitle}>{juryContestStore.view.contest.title}</p>
            <p className={styles.juryPriorityContestSubtitle}>
              {juryContestStore.view.contest.description || 'Оценка конкурса'}
            </p>
          </article>

          <div className={styles.juryPriorityPanel}>
            <div className={styles.juryPriorityPanelHeader}>
              <h3 className={styles.juryPriorityPanelTitle}>Приоритет показателей оценивания</h3>
              <p className={styles.juryPriorityPanelHint}>Расставьте показатели по приоритетам</p>
            </div>
            {juryContestStore.priorityDraftIds.map((criterionId, index) => {
              const criterion = juryContestStore.view?.criteria.find((criterionItem) => criterionItem.id === criterionId)
              if (!criterion) return null
              const isDragging = touchDragFrom === index
              const isOver = touchDragOver === index && touchDragFrom !== null && touchDragFrom !== index
              return (
                <div key={criterionId}>
                  <div
                    className={`${styles.juryPriorityRow} ${isDragging ? styles.juryPriorityRowDragging : ''} ${
                      isOver ? styles.juryPriorityRowDragOver : ''
                    }`}
                    data-priority-row-index={index}
                    onPointerDown={(event) => {
                      onPriorityDragStart(index, event.pointerId, event.currentTarget)
                    }}
                    onPointerMove={onPriorityDragMove}
                    onPointerUp={(event) => {
                      onPriorityDragEnd(event.pointerId)
                    }}
                    onPointerCancel={(event) => {
                      onPriorityDragCancel(event.pointerId)
                    }}
                  >
                    <div className={styles.juryPriorityNamePlate}>
                      <span className={styles.juryPriorityNameText}>{criterion.name}</span>
                      <span aria-hidden className={styles.juryPriorityDragHandle}>
                        ⋮⋮
                      </span>
                    </div>
                  </div>
                  {index < juryContestStore.priorityDraftIds.length - 1 ? (
                    <div className={styles.juryPriorityInequalityRow}>
                      <span className={styles.juryPriorityInequalityText}>
                        {index + 1} и {index + 2}
                      </span>
                      <select
                        aria-label={`Оператор между приоритетами ${index + 1} и ${index + 2}`}
                        className={styles.juryPriorityInequalitySelect}
                        onChange={(event) => {
                          const nextValue = event.target.value as 'gt' | 'eq' | 'gte'
                          juryContestStore.setPriorityInequality(index, nextValue)
                        }}
                        value={juryContestStore.priorityDraftInequalities[index] ?? 'gt'}
                      >
                        {INEQUALITY_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
          <button
            ref={prioritySaveButtonReference}
            className={styles.juryPrioritySaveButton}
            disabled={juryContestStore.isSavingPriorityOrder}
            type="button"
            onClick={onOpenPriorityConfirm}
          >
            {juryContestStore.isSavingPriorityOrder ? 'Сохранение...' : 'Сохранить и продолжить'}
          </button>

          {isMobilePriorityConfirmOpen ? (
            <div className={styles.juryPriorityConfirmOverlay} onClick={onClosePriorityConfirm}>
              <div className={styles.juryPriorityConfirmModal} onClick={(event) => event.stopPropagation()}>
                <div className={styles.juryPriorityConfirmBody}>
                  <div className={styles.juryPriorityConfirmTextGroup}>
                    <div className={styles.juryPriorityConfirmTitle}>Вы уверены, что хотите сохранить указанные приоритеты?</div>
                    <div className={styles.juryPriorityConfirmSubtitle}>Вы не сможете поменять приоритеты после</div>
                  </div>
                  <div className={styles.juryPriorityConfirmActions}>
                    <button
                      type="button"
                      className={styles.juryPriorityConfirmSaveButton}
                      disabled={juryContestStore.isSavingPriorityOrder}
                      onClick={() => void onPriorityContinue()}
                    >
                      Сохранить
                    </button>
                    <button
                      type="button"
                      className={styles.juryPriorityConfirmStayButton}
                      disabled={juryContestStore.isSavingPriorityOrder}
                      onClick={onClosePriorityConfirm}
                    >
                      Остаться
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
      {isScoringStepVisible && juryContestStore.view ? (
        <div className={styles.juryScoreLayout}>
          <article className={styles.juryPriorityContestCard}>
            <p className={styles.juryPriorityContestDate}>{formatDate(juryContestStore.view.contest.createdAt)}</p>
            <p className={styles.juryPriorityContestTitle}>{juryContestStore.view.contest.title}</p>
            <p className={styles.juryPriorityContestSubtitle}>{juryContestStore.view.contest.description || 'Оценка конкурса'}</p>
          </article>

          <div className={styles.juryScoreParticipantList}>
            {juryContestStore.view.participants.map((participant) => {
              const photoUrl = resolveMediaUrl(participant.photoUrl)
              const isCommentSaving = juryContestStore.isCommentSaving(participant.id)
              const isAnyCommentSaving = juryContestStore.isAnyCommentSaving()
              const commentSaveErrorText = juryContestStore.getCommentSaveError(participant.id)
              const contestId = juryContestStore.view?.contest.id ?? 0
              return (
                <details className={styles.juryScoreParticipantSection} key={participant.id}>
                  <summary className={styles.juryScoreParticipantSummary}>
                    <div className={styles.juryScoreParticipantMain}>
                      {photoUrl ? (
                        <img className={styles.juryScoreParticipantPhoto} src={photoUrl} alt={participant.fullName} />
                      ) : (
                        <div className={styles.juryScoreParticipantPhoto}>{getInitials(participant.fullName)}</div>
                      )}
                      <div className={styles.juryScoreParticipantMeta}>
                        <span className={styles.juryScoreParticipantName}>
                          {participant.fullName}
                          {participant.extraInfo ? `, ${participant.extraInfo}` : ''}
                        </span>
                        <span className={styles.juryScoreParticipantCountry}>{participant.country || 'Страна не указана'}</span>
                      </div>
                      <button
                        className={styles.participantLikesIndicator}
                        type="button"
                        disabled
                        aria-label={`Лайков показателей: ${juryContestStore.getParticipantCriterionLikesCount(participant.id)}`}
                      >
                        <img
                          src={
                            juryContestStore.getParticipantCriterionLikesCount(participant.id) > 0
                              ? '/heart-big-active.svg'
                              : '/heart-big-no-active.svg'
                          }
                          alt=""
                          aria-hidden
                        />
                        {juryContestStore.getParticipantCriterionLikesCount(participant.id) > 0 ? (
                          <span>{juryContestStore.getParticipantCriterionLikesCount(participant.id)}</span>
                        ) : null}
                      </button>
                    </div>
                    <strong className={styles.juryScoreAverageBadge}>{juryContestStore.getParticipantAverage(participant.id)} / 10</strong>
                  </summary>

                  <div className={styles.juryScoreCriteriaWrap}>
                    {sortCriteriaRows(juryContestStore.view?.criteria ?? []).map((criterion) => {
                      const min = criterion.minScore ?? 0
                      const max = criterion.maxScore
                      const range = Math.max(1, max - min)
                      const value = juryContestStore.getScore(participant.id, criterion.id, min)
                      const clamped = Math.min(max, Math.max(min, value))
                      const percent = range > 0 ? ((clamped - min) / range) * 100 : 0
                      return (
                        <div className={styles.juryScoreCriterionRow} key={criterion.id}>
                          <div className={styles.juryScoreCriterionHead}>                            
                            <button
                              className={styles.criterionLikeButton}
                              type="button"
                              disabled={isScoreEditingLocked}
                              aria-pressed={juryContestStore.isCriterionFavorite(participant.id, criterion.id)}
                              aria-label={
                                juryContestStore.isCriterionFavorite(participant.id, criterion.id)
                                  ? 'Убрать показатель из избранного'
                                  : 'Добавить показатель в избранное'
                              }
                              onClick={(event) => {
                                event.preventDefault()
                                event.stopPropagation()
                                juryContestStore.toggleCriterionFavorite(participant.id, criterion.id)
                              }}
                            >
                              <img
                                src={
                                  juryContestStore.isCriterionFavorite(participant.id, criterion.id)
                                    ? '/heart-small-active.svg'
                                    : '/heart-small-no-active.svg'
                                }
                                alt=""
                                aria-hidden
                              />
                            </button>
                            <div className={styles.juryScoreCriterionLabel}>{criterion.name}</div>
                          </div>
                          <div className={styles.juryScoreSliderWrap}>
                            <span className={styles.juryScoreBoundaryValue}>{min}</span>
                            <div
                              className={styles.juryScoreSliderTrackWrap}
                              onPointerDown={(event) => {
                                if (isScoreEditingLocked) return
                                scoreSliderPointerStateReference.current = {
                                  pointerId: event.pointerId,
                                  startX: event.clientX,
                                  startY: event.clientY,
                                  isHorizontalSwipeLocked: false,
                                  isVerticalScrollLocked: false,
                                }
                              }}
                              onPointerMove={(event) => {
                                if (isScoreEditingLocked) return
                                const scoreSliderPointerState = scoreSliderPointerStateReference.current
                                if (scoreSliderPointerState.pointerId !== event.pointerId) return
                                if (!scoreSliderPointerState.isHorizontalSwipeLocked && !scoreSliderPointerState.isVerticalScrollLocked) {
                                  const deltaX = event.clientX - scoreSliderPointerState.startX
                                  const deltaY = event.clientY - scoreSliderPointerState.startY
                                  const absoluteDeltaX = Math.abs(deltaX)
                                  const absoluteDeltaY = Math.abs(deltaY)
                                  if (absoluteDeltaY > absoluteDeltaX && absoluteDeltaY >= horizontalSwipeThresholdPx) {
                                    scoreSliderPointerStateReference.current = {
                                      ...scoreSliderPointerState,
                                      isVerticalScrollLocked: true,
                                    }
                                    return
                                  }
                                  if (absoluteDeltaX >= horizontalSwipeThresholdPx) {
                                    scoreSliderPointerStateReference.current = {
                                      ...scoreSliderPointerState,
                                      isHorizontalSwipeLocked: true,
                                    }
                                    event.currentTarget.setPointerCapture(event.pointerId)
                                  } else {
                                    return
                                  }
                                }
                                if (scoreSliderPointerStateReference.current.isVerticalScrollLocked) return
                                if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
                                event.preventDefault()
                                const nextValue = getScoreByPointerPosition({
                                  clientX: event.clientX,
                                  trackElement: event.currentTarget,
                                  min,
                                  max,
                                })
                                scheduleDebouncedScoreUpdate({
                                  participantId: participant.id,
                                  criterionId: criterion.id,
                                  value: nextValue,
                                })
                              }}
                              onPointerUp={(event) => {
                                const scoreSliderPointerState = scoreSliderPointerStateReference.current
                                if (scoreSliderPointerState.pointerId !== event.pointerId) return
                                if (scoreSliderPointerState.isHorizontalSwipeLocked && event.currentTarget.hasPointerCapture(event.pointerId)) {
                                  const nextValue = getScoreByPointerPosition({
                                    clientX: event.clientX,
                                    trackElement: event.currentTarget,
                                    min,
                                    max,
                                  })
                                  pendingScoreUpdateReference.current = {
                                    participantId: participant.id,
                                    criterionId: criterion.id,
                                    value: nextValue,
                                  }
                                  flushDebouncedScoreUpdate()
                                  event.currentTarget.releasePointerCapture(event.pointerId)
                                }
                                scoreSliderPointerStateReference.current = {
                                  pointerId: null,
                                  startX: 0,
                                  startY: 0,
                                  isHorizontalSwipeLocked: false,
                                  isVerticalScrollLocked: false,
                                }
                              }}
                              onPointerCancel={(event) => {
                                const scoreSliderPointerState = scoreSliderPointerStateReference.current
                                if (scoreSliderPointerState.pointerId !== event.pointerId) return
                                if (scoreSliderPointerState.isHorizontalSwipeLocked && event.currentTarget.hasPointerCapture(event.pointerId)) {
                                  flushDebouncedScoreUpdate()
                                  event.currentTarget.releasePointerCapture(event.pointerId)
                                }
                                scoreSliderPointerStateReference.current = {
                                  pointerId: null,
                                  startX: 0,
                                  startY: 0,
                                  isHorizontalSwipeLocked: false,
                                  isVerticalScrollLocked: false,
                                }
                              }}
                            >
                              <div className={styles.juryScoreSliderTrack}>
                                <div className={styles.juryScoreSliderProgress} style={{ width: `${percent}%` }} />
                              </div>
                              <input
                                className={styles.juryScoreSliderInput}
                                type="range"
                                min={min}
                                max={max}
                                step={1}
                                value={clamped}
                                disabled={isScoreEditingLocked}
                                onChange={(event) => juryContestStore.setScore(participant.id, criterion.id, Number(event.target.value))}
                              />
                              <span className={styles.juryScoreSliderValue} style={{ left: `calc(${percent}% - 18px)` }}>
                                {clamped}
                              </span>
                            </div>
                            <span className={styles.juryScoreBoundaryValue}>{max}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className={styles.juryScoreCommentCard}>
                    <label className={styles.juryScoreCommentLabel} htmlFor={`sheet-comment-${participant.id}`}>
                      Комментарий для участника
                    </label>
                    <textarea
                      id={`sheet-comment-${participant.id}`}
                      className={styles.juryScoreCommentInput}
                      value={juryContestStore.getComment(participant.id)}
                      maxLength={commentLimit}
                      readOnly={isScoreEditingLocked}
                      placeholder="Оставьте обратную связь по выступлению"
                      onChange={(event) => juryContestStore.setComment(participant.id, event.target.value)}
                    />
                    <div className={styles.juryScoreCommentFooter}>
                      <div className={styles.juryScoreCommentCounter}>
                        {juryContestStore.getComment(participant.id).length}
                        <span className={styles.juryScoreCommentDivider}>/</span>
                        {commentLimit}
                      </div>
                      <button
                        className={styles.juryScoreCommentSaveButton}
                        type="button"
                        disabled={isScoreEditingLocked || juryContestStore.isSubmitting || isAnyCommentSaving}
                        onClick={() => void juryContestStore.saveCommentDraft(contestId, participant.id)}
                      >
                        {isCommentSaving ? 'Сохранение...' : 'Сохранить'}
                      </button>
                    </div>
                    {commentSaveErrorText ? <p className={styles.juryScoreCommentSaveError}>{commentSaveErrorText}</p> : null}
                  </div>
                </details>
              )
            })}
          </div>

          {isCompletedContest ? (
            <button className={styles.juryPrioritySaveButton} type="button" onClick={onOpenResults}>
              Результаты
            </button>
          ) : (
            <>
              <button
                className={styles.juryPrioritySaveButton}
                disabled={!canStartRevote || juryContestStore.isRevokingSubmission || juryContestStore.isSubmitting}
                type="button"
                onClick={() => void onStartRevote()}
              >
                {juryContestStore.isRevokingSubmission ? 'Подготовка...' : 'Переголосовать'}
              </button>
              <button
                className={styles.juryPrioritySaveButton}
                disabled={juryContestStore.isSubmitting || (Boolean(juryContestStore.view.mySubmitted) && !juryContestStore.isRevoteMode)}
                type="button"
                onClick={() => void onSubmitScores()}
              >
                {juryContestStore.isSubmitting ? 'Отправка...' : juryContestStore.isRevoteMode ? 'Отправить повторно' : 'Завершить'}
              </button>
            </>
          )}

          {isMobileLeaveConfirmOpen ? (
            <div className={styles.juryPriorityConfirmOverlay} onClick={onCloseLeaveConfirm}>
              <div className={styles.juryPriorityConfirmModal} onClick={(event) => event.stopPropagation()}>
                <div className={styles.juryPriorityConfirmBody}>
                  <div className={styles.juryPriorityConfirmTextGroup}>
                    <div className={styles.juryPriorityConfirmTitle}>Вы уверены, что хотите покинуть страницу оценок?</div>
                    <div className={styles.juryPriorityConfirmSubtitle}>Изменения оценок не будут сохранены</div>
                  </div>
                  <div className={styles.juryPriorityConfirmActions}>
                    <button
                      type="button"
                      className={styles.juryPriorityConfirmSaveButton}
                      disabled={juryContestStore.isSubmitting}
                      onClick={onCloseSheetWithConfirm}
                    >
                      Покинуть
                    </button>
                    <button
                      type="button"
                      className={styles.juryPriorityConfirmStayButton}
                      disabled={juryContestStore.isSubmitting}
                      onClick={onCloseLeaveConfirm}
                    >
                      Остаться
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </BottomSheet>
  )
})
