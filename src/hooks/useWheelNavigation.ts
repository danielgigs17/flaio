"use client"

import { useRef, useCallback, useEffect, type RefObject } from "react"

export function useWheelNavigation(
  containerRef: RefObject<HTMLElement | null>,
  onNext: () => void,
  onPrev: () => void,
  threshold: number = 50
) {
  const accumulatedDelta = useRef(0)
  const isProcessing = useRef(false)

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault()

      if (isProcessing.current) return

      accumulatedDelta.current += e.deltaY

      if (accumulatedDelta.current > threshold) {
        isProcessing.current = true
        onNext()
        accumulatedDelta.current = 0
        setTimeout(() => {
          isProcessing.current = false
        }, 200)
      } else if (accumulatedDelta.current < -threshold) {
        isProcessing.current = true
        onPrev()
        accumulatedDelta.current = 0
        setTimeout(() => {
          isProcessing.current = false
        }, 200)
      }
    },
    [onNext, onPrev, threshold]
  )

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    el.addEventListener("wheel", handleWheel, { passive: false })
    return () => el.removeEventListener("wheel", handleWheel)
  }, [containerRef, handleWheel])
}
