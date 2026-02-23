"use client"

import { useRef, useCallback, useEffect, useState } from "react"
import { motion, animate, useMotionValue } from "framer-motion"
import { useWheelNavigation } from "@/hooks/useWheelNavigation"
import { useAutoAdvance, useIdleResume } from "@/hooks/useAutoAdvance"

const ITEM_HEIGHT = 72
const VISIBLE_ITEMS = 5

interface ScrollWheelProps {
  items: string[]
  activeIndex: number
  onActiveChange: (index: number) => void
}

const SPRING = {
  type: "spring" as const,
  stiffness: 350,
  damping: 35,
  mass: 0.7,
}

export default function ScrollWheel({
  items,
  activeIndex,
  onActiveChange,
}: ScrollWheelProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const y = useMotionValue(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)
  const count = items.length

  // Animate to a given index
  const goToIndex = useCallback(
    (index: number) => {
      const target = -index * ITEM_HEIGHT
      animate(y, target, SPRING)
      onActiveChange(((index % count) + count) % count)
    },
    [y, onActiveChange, count]
  )

  // Go to next/prev
  const goNext = useCallback(() => {
    const currentIdx = Math.round(-y.get() / ITEM_HEIGHT)
    goToIndex(currentIdx + 1)
  }, [y, goToIndex])

  const goPrev = useCallback(() => {
    const currentIdx = Math.round(-y.get() / ITEM_HEIGHT)
    goToIndex(currentIdx - 1)
  }, [y, goToIndex])

  // Infinite loop reset: when we scroll far enough, silently reset
  useEffect(() => {
    const unsubscribe = y.on("change", (latest) => {
      const currentIdx = Math.round(-latest / ITEM_HEIGHT)
      if (currentIdx >= count * 2) {
        const resetIdx = currentIdx - count
        y.jump(-resetIdx * ITEM_HEIGHT)
      } else if (currentIdx < -count) {
        const resetIdx = currentIdx + count
        y.jump(-resetIdx * ITEM_HEIGHT)
      }
    })
    return unsubscribe
  }, [y, count])

  // Pause/resume auto-play on interaction
  const pauseAndResume = useIdleResume(
    () => setIsAutoPlaying(true),
    () => setIsAutoPlaying(false)
  )

  // Auto-advance
  useAutoAdvance(goNext, 3500, isAutoPlaying)

  // Mouse wheel navigation
  useWheelNavigation(
    containerRef,
    () => {
      pauseAndResume()
      goNext()
    },
    () => {
      pauseAndResume()
      goPrev()
    }
  )

  // Touch drag support (iOS + Android)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    let startY = 0
    let startMotionY = 0
    let isDragging = false

    const handleTouchStart = (e: TouchEvent) => {
      isDragging = true
      startY = e.touches[0].clientY
      startMotionY = y.get()
      pauseAndResume()
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging) return
      e.preventDefault()
      const delta = e.touches[0].clientY - startY
      y.set(startMotionY + delta)
    }

    const handleTouchEnd = () => {
      if (!isDragging) return
      isDragging = false
      // Snap to nearest item
      const currentIdx = Math.round(-y.get() / ITEM_HEIGHT)
      goToIndex(currentIdx)
    }

    el.addEventListener("touchstart", handleTouchStart, { passive: true })
    el.addEventListener("touchmove", handleTouchMove, { passive: false })
    el.addEventListener("touchend", handleTouchEnd)

    return () => {
      el.removeEventListener("touchstart", handleTouchStart)
      el.removeEventListener("touchmove", handleTouchMove)
      el.removeEventListener("touchend", handleTouchEnd)
    }
  }, [y, goToIndex, pauseAndResume])

  // Keyboard navigation
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        pauseAndResume()
        goNext()
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        pauseAndResume()
        goPrev()
      }
    }

    el.addEventListener("keydown", handleKey)
    return () => el.removeEventListener("keydown", handleKey)
  }, [goNext, goPrev, pauseAndResume])

  // Reduced motion: disable auto-play
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    if (mq.matches) setIsAutoPlaying(false)
    const handler = (e: MediaQueryListEvent) => {
      if (e.matches) setIsAutoPlaying(false)
    }
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])

  // Render many copies for infinite scroll illusion
  const renderItems = () => {
    const copies = 7
    const allItems: { word: string; globalIdx: number }[] = []
    const startCopy = -Math.floor(copies / 2)

    for (let c = startCopy; c < startCopy + copies; c++) {
      items.forEach((word, i) => {
        allItems.push({ word, globalIdx: c * count + i })
      })
    }

    return allItems.map(({ word, globalIdx }) => {
      const itemY = globalIdx * ITEM_HEIGHT

      return (
        <WheelItem
          key={`${word}-${globalIdx}`}
          word={word}
          itemY={itemY}
          parentY={y}
          onClick={() => {
            pauseAndResume()
            goToIndex(globalIdx)
          }}
        />
      )
    })
  }

  return (
    <div
      ref={containerRef}
      className="relative cursor-ns-resize select-none outline-none"
      style={{
        height: VISIBLE_ITEMS * ITEM_HEIGHT,
      }}
      tabIndex={0}
      role="listbox"
      aria-label="Select a project category"
    >
      <motion.div
        className="absolute left-0 right-0"
        style={{
          y,
          top: Math.floor(VISIBLE_ITEMS / 2) * ITEM_HEIGHT,
        }}
      >
        {renderItems()}
      </motion.div>
    </div>
  )
}

// ── Individual wheel item ──

interface WheelItemProps {
  word: string
  itemY: number
  parentY: ReturnType<typeof useMotionValue<number>>
  onClick: () => void
}

function applyItemStyles(el: HTMLElement, itemY: number, latestY: number) {
  const itemPos = itemY + latestY
  const distance = Math.abs(itemPos)
  const isActive = distance < ITEM_HEIGHT * 0.4

  // Steeper falloff: fully invisible beyond 2.5 items
  const maxDist = ITEM_HEIGHT * 2.5
  const normalizedDist = Math.min(distance / maxDist, 1)
  const opacity = distance > maxDist ? 0 : Math.pow(1 - normalizedDist, 1.5)
  const scale = 1 - normalizedDist * 0.3
  const blur = normalizedDist * 2

  el.style.opacity = String(Math.max(opacity, 0))
  el.style.transform = `translateX(-50%) translateY(${itemY}px) scale(${scale})`
  el.style.filter = blur > 0.1 ? `blur(${blur}px)` : "none"
  el.style.pointerEvents = opacity < 0.01 ? "none" : "auto"

  // Use theme-aware font weights
  const activeWeight = getComputedStyle(document.documentElement).getPropertyValue("--wheel-active-weight").trim() || "600"
  const inactiveWeight = getComputedStyle(document.documentElement).getPropertyValue("--wheel-inactive-weight").trim() || "300"
  el.style.fontWeight = isActive ? activeWeight : inactiveWeight

  // Set data attribute for theme-specific glow effects
  el.setAttribute("data-wheel-active", String(isActive))
}

function WheelItem({ word, itemY, parentY, onClick }: WheelItemProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // Set initial position immediately
    applyItemStyles(el, itemY, parentY.get())

    // Subscribe to future changes
    const unsubscribe = parentY.on("change", (latestY) => {
      applyItemStyles(el, itemY, latestY)
    })

    return unsubscribe
  }, [parentY, itemY])

  return (
    <div
      ref={ref}
      role="option"
      aria-selected={false}
      className="absolute flex items-center justify-center cursor-pointer whitespace-nowrap"
      style={{
        height: ITEM_HEIGHT,
        left: "50%",
        fontFamily: "var(--font-display)",
        fontSize: "clamp(2rem, 5vw, 4.5rem)",
        lineHeight: 1.1,
        letterSpacing: "var(--display-tracking)",
        textTransform: "var(--display-transform)" as unknown as "none",
        willChange: "transform, opacity, filter",
      }}
      onClick={onClick}
    >
      {word}
    </div>
  )
}
