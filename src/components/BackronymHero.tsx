"use client"

import { useState, useCallback, useRef, useEffect, type MouseEvent } from "react"
import { motion } from "framer-motion"
import ScrollWheel from "./ScrollWheel"
import ProjectPanel from "./ProjectPanel"
import { projects } from "@/data/projects"

const SIDE_SPRING = { type: "spring" as const, stiffness: 200, damping: 25, mass: 0.8 }

export default function BackronymHero() {
  const [activeIndex, setActiveIndex] = useState(0)
  const measureRef = useRef<HTMLSpanElement>(null)
  const [wordWidth, setWordWidth] = useState(200)
  const [isMd, setIsMd] = useState(false)
  const [panelHovered, setPanelHovered] = useState(false)

  const words = projects.map((p) => p.word)

  const handleActiveChange = useCallback((index: number) => {
    setActiveIndex(index)
  }, [])

  const activeProject =
    projects[((activeIndex % projects.length) + projects.length) % projects.length]

  // Detect md+ breakpoint
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)")
    setIsMd(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMd(e.matches)
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])

  const handlePanelEnter = useCallback(() => setPanelHovered(true), [])
  const handlePanelLeave = useCallback(() => setPanelHovered(false), [])

  // Measure the active word's rendered width
  useEffect(() => {
    const span = measureRef.current
    if (!span) return
    const update = () => setWordWidth(span.offsetWidth)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(span)
    return () => ro.disconnect()
  }, [activeProject.word])

  return (
    <section className="min-h-[100svh] flex flex-col items-center justify-center px-6 py-16 md:py-20 overflow-x-clip">
      {/* Hidden measurement span — same font as wheel items */}
      <span
        ref={measureRef}
        aria-hidden="true"
        className="absolute opacity-0 pointer-events-none whitespace-nowrap"
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(2rem, 5vw, 4.5rem)",
          lineHeight: 1.1,
          letterSpacing: "var(--display-tracking)",
          fontWeight: "var(--wheel-active-weight, 600)" as unknown as number,
          textTransform: "var(--display-transform)" as unknown as "none",
        }}
      >
        {activeProject.word}
      </span>

      {/* ── Backronym line ── */}
      <div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-4 w-full max-w-7xl">
        {/* "fun little" */}
        <div
          className="text-ink text-center md:text-right md:whitespace-nowrap flex-shrink-0 z-10"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(2.2rem, 5vw, 4rem)",
            lineHeight: 1.1,
            letterSpacing: "var(--display-tracking)",
            fontWeight: "var(--display-weight)" as unknown as number,
            textTransform: "var(--display-transform)" as unknown as "none",
          }}
        >
          fun little
        </div>

        {/* Scroll wheel — animated width based on active word */}
        <motion.div
          suppressHydrationWarning
          className="w-full md:w-auto relative overflow-visible"
          animate={isMd ? { width: wordWidth + 48 } : undefined}
          transition={SIDE_SPRING}
          style={{ minHeight: 360 }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-full">
              <ScrollWheel
                items={words}
                activeIndex={activeIndex}
                onActiveChange={handleActiveChange}
                paused={panelHovered}
              />
            </div>
          </div>
        </motion.div>

        {/* "i own" */}
        <div
          className="text-ink text-center md:text-left md:whitespace-nowrap flex-shrink-0 z-10"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(2.2rem, 5vw, 4rem)",
            lineHeight: 1.1,
            letterSpacing: "var(--display-tracking)",
            fontWeight: "var(--display-weight)" as unknown as number,
            textTransform: "var(--display-transform)" as unknown as "none",
          }}
        >
          i own
        </div>
      </div>

      {/* ── Project panel ── */}
      <div onMouseEnter={handlePanelEnter} onMouseLeave={handlePanelLeave}>
        <ProjectPanel project={activeProject} />
      </div>
    </section>
  )
}
