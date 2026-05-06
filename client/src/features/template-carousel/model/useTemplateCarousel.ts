import { useEffect, useRef, useState } from 'react'

type UseTemplateCarouselParams = {
  isEnabled: boolean
  scrollStep: number
}

export function useTemplateCarousel(params: UseTemplateCarouselParams) {
  const { isEnabled, scrollStep } = params
  const carouselReference = useRef<HTMLDivElement | null>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  useEffect(() => {
    const carouselElement = carouselReference.current
    if (!carouselElement || !isEnabled) {
      setCanScrollLeft(false)
      setCanScrollRight(false)
      return
    }

    const updateCarouselControls = () => {
      const maxScrollLeft = carouselElement.scrollWidth - carouselElement.clientWidth
      setCanScrollLeft(carouselElement.scrollLeft > 2)
      setCanScrollRight(maxScrollLeft - carouselElement.scrollLeft > 2)
    }

    updateCarouselControls()
    carouselElement.addEventListener('scroll', updateCarouselControls, { passive: true })
    window.addEventListener('resize', updateCarouselControls)

    return () => {
      carouselElement.removeEventListener('scroll', updateCarouselControls)
      window.removeEventListener('resize', updateCarouselControls)
    }
  }, [isEnabled])

  const scrollLeft = () => {
    carouselReference.current?.scrollBy({
      left: -scrollStep,
      behavior: 'smooth',
    })
  }

  const scrollRight = () => {
    carouselReference.current?.scrollBy({
      left: scrollStep,
      behavior: 'smooth',
    })
  }

  return {
    carouselReference,
    canScrollLeft,
    canScrollRight,
    scrollLeft,
    scrollRight,
  }
}
