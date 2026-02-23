"use client"

import { motion, type Variants } from "framer-motion"
import { useState, useEffect } from "react"

type AnimateMode = boolean | "idle" | "entrance" | "spin"

interface FlaioMarkProps {
  size?: number
  animate?: AnimateMode
  className?: string
  variant?: "stroke" | "fill" | "watermark"
}

const SYMBOLS = [
  { id: "sparkle", cx: 50, cy: 20 },
  { id: "waveform", cx: 80, cy: 50 },
  { id: "bee", cx: 50, cy: 80 },
  { id: "diamond", cx: 20, cy: 50 },
] as const

// ── Entrance: fly out from center ──
const entranceContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
  },
}

function entranceSymbol(cx: number, cy: number): Variants {
  return {
    hidden: {
      x: 50 - cx,
      y: 50 - cy,
      scale: 0,
      opacity: 0,
    },
    visible: {
      x: 0,
      y: 0,
      scale: 1,
      opacity: 1,
      transition: { type: "spring", stiffness: 300, damping: 20, mass: 0.8 },
    },
  }
}

// ── Idle: breathing pulse ──
function idleAnimation(index: number) {
  return {
    scale: [1, 1.1, 1],
    transition: {
      duration: 3,
      ease: "easeInOut" as const,
      repeat: Infinity,
      delay: index * 0.6,
    },
  }
}

// ── Spin: full rotation ──
const spinAnimation = {
  rotate: 360,
  transition: { duration: 2, ease: "linear" as const, repeat: Infinity },
}

// ── Symbol renderers ──

function Diamond({ stroke }: { stroke: boolean }) {
  return stroke ? (
    <path
      d="M20 40 L28 50 L20 60 L12 50 Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  ) : (
    <path d="M20 40 L28 50 L20 60 L12 50 Z" fill="currentColor" />
  )
}

function Bee({ stroke }: { stroke: boolean }) {
  if (stroke) {
    return (
      <>
        <ellipse cx="50" cy="82" rx="6" ry="4" fill="none" stroke="currentColor" strokeWidth="1.2" />
        <ellipse cx="45" cy="76" rx="3.5" ry="5" fill="none" stroke="currentColor" strokeWidth="0.8" opacity="0.6" transform="rotate(-20, 45, 76)" />
        <ellipse cx="55" cy="76" rx="3.5" ry="5" fill="none" stroke="currentColor" strokeWidth="0.8" opacity="0.6" transform="rotate(20, 55, 76)" />
      </>
    )
  }
  return (
    <>
      <ellipse cx="50" cy="82" rx="6" ry="4" fill="currentColor" />
      <ellipse cx="45" cy="76" rx="3.5" ry="5" fill="currentColor" opacity="0.45" transform="rotate(-20, 45, 76)" />
      <ellipse cx="55" cy="76" rx="3.5" ry="5" fill="currentColor" opacity="0.45" transform="rotate(20, 55, 76)" />
      <line x1="47" y1="81" x2="53" y2="81" stroke="var(--color-page)" strokeWidth="0.8" />
      <line x1="47" y1="83" x2="53" y2="83" stroke="var(--color-page)" strokeWidth="0.8" />
    </>
  )
}

function Waveform({ stroke }: { stroke: boolean }) {
  const bars = [
    { x: 72, y: 46, h: 8 },
    { x: 75.5, y: 42, h: 16 },
    { x: 79, y: 39, h: 22 },
    { x: 82.5, y: 43, h: 14 },
    { x: 86, y: 46, h: 8 },
  ]
  return (
    <>
      {bars.map((b, i) =>
        stroke ? (
          <rect
            key={i}
            x={b.x}
            y={b.y}
            width="2"
            height={b.h}
            rx="1"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.8"
          />
        ) : (
          <rect key={i} x={b.x} y={b.y} width="2" height={b.h} rx="1" fill="currentColor" />
        )
      )}
    </>
  )
}

function Sparkle({ stroke }: { stroke: boolean }) {
  const d = "M50 10 L52.5 17 L59 20 L52.5 23 L50 30 L47.5 23 L41 20 L47.5 17 Z"
  return stroke ? (
    <path
      d={d}
      fill="none"
      stroke="var(--color-accent)"
      strokeWidth="1.5"
      strokeLinejoin="round"
      className="flaio-mark-accent"
    />
  ) : (
    <path d={d} fill="var(--color-accent)" className="flaio-mark-accent" />
  )
}

const RENDERERS = {
  sparkle: Sparkle,
  waveform: Waveform,
  bee: Bee,
  diamond: Diamond,
} as const

export default function FlaioMark({
  size = 32,
  animate = false,
  className = "",
  variant = "fill",
}: FlaioMarkProps) {
  const [phase, setPhase] = useState<"entrance" | "idle">("entrance")
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    setReducedMotion(mq.matches)
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])

  const mode: AnimateMode = reducedMotion ? false : animate
  const isStroke = variant === "stroke"
  const isWatermark = variant === "watermark"

  const shouldEntrance = mode === true || mode === "entrance"
  const shouldIdle = mode === "idle" || (mode === true && phase === "idle")
  const shouldSpin = mode === "spin"

  if (isWatermark) {
    return (
      <div className={`flaio-watermark ${className}`} aria-hidden="true">
        <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
          <path d="M50 10 L52.5 17 L59 20 L52.5 23 L50 30 L47.5 23 L41 20 L47.5 17 Z" fill="var(--color-accent)" opacity="0.04" />
          <path d="M20 40 L28 50 L20 60 L12 50 Z" fill="var(--color-accent)" opacity="0.03" />
          <ellipse cx="50" cy="82" rx="6" ry="4" fill="var(--color-accent)" opacity="0.03" />
          {[72, 75.5, 79, 82.5, 86].map((x, i) => (
            <rect key={i} x={x} y={39 + Math.abs(i - 2) * 3} width="2" height={22 - Math.abs(i - 2) * 6} rx="1" fill="var(--color-accent)" opacity="0.03" />
          ))}
          <circle cx="50" cy="50" r="3" fill="var(--color-accent)" opacity="0.03" />
        </svg>
      </div>
    )
  }

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="FLAIO"
      role="img"
    >
      {/* Outer group for spin animation */}
      <motion.g
        style={{ transformOrigin: "50px 50px" }}
        animate={shouldSpin ? spinAnimation : undefined}
      >
        {/* Entrance stagger container */}
        <motion.g
          variants={shouldEntrance ? entranceContainer : undefined}
          initial={shouldEntrance ? "hidden" : undefined}
          animate={shouldEntrance ? "visible" : undefined}
          onAnimationComplete={() => {
            if (mode === true) setPhase("idle")
          }}
        >
          {SYMBOLS.map((sym, i) => {
            const Renderer = RENDERERS[sym.id]
            return (
              <motion.g
                key={sym.id}
                className="flaio-mark-symbol"
                variants={shouldEntrance ? entranceSymbol(sym.cx, sym.cy) : undefined}
                style={{ transformOrigin: `${sym.cx}px ${sym.cy}px` }}
              >
                <motion.g
                  animate={shouldIdle ? idleAnimation(i) : undefined}
                  style={{ transformOrigin: `${sym.cx}px ${sym.cy}px` }}
                >
                  <Renderer stroke={isStroke} />
                </motion.g>
              </motion.g>
            )
          })}
        </motion.g>

        {/* Center hub */}
        <circle
          cx="50"
          cy="50"
          r="3"
          fill="var(--color-accent)"
          opacity="0.4"
          className="flaio-mark-hub"
        />
      </motion.g>
    </svg>
  )
}
