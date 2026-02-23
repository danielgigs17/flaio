"use client"

import { useEffect, useRef, useCallback } from "react"

export function useAutoAdvance(
  advance: () => void,
  interval: number = 3500,
  enabled: boolean = true
) {
  const savedAdvance = useRef(advance)

  useEffect(() => {
    savedAdvance.current = advance
  }, [advance])

  useEffect(() => {
    if (!enabled) return

    const id = setInterval(() => {
      if (!document.hidden) {
        savedAdvance.current()
      }
    }, interval)

    return () => clearInterval(id)
  }, [interval, enabled])
}

export function useIdleResume(
  onResume: () => void,
  onPause: () => void,
  idleDelay: number = 5000
) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const pause = useCallback(() => {
    onPause()
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(onResume, idleDelay)
  }, [onPause, onResume, idleDelay])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  return pause
}
