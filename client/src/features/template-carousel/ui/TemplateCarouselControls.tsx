import localStyles from './TemplateCarouselControls.module.css'

type TemplateCarouselControlsProps = {
  canScrollLeft: boolean
  canScrollRight: boolean
  onScrollLeft: () => void
  onScrollRight: () => void
}

export function TemplateCarouselControls(props: TemplateCarouselControlsProps) {
  const { canScrollLeft, canScrollRight, onScrollLeft, onScrollRight } = props

  return (
    <div className={localStyles.controls}>
      <button
        type="button"
        className={localStyles.button}
        onClick={onScrollLeft}
        disabled={!canScrollLeft}
        aria-label="Прокрутить шаблоны влево"
      >
        ←
      </button>
      <button
        type="button"
        className={localStyles.button}
        onClick={onScrollRight}
        disabled={!canScrollRight}
        aria-label="Прокрутить шаблоны вправо"
      >
        →
      </button>
    </div>
  )
}
