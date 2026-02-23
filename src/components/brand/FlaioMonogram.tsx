"use client"

import { useEffect, useRef } from "react"

interface FlaioMonogramProps {
  size?: number
  className?: string
  animate?: boolean
  /** "stroke" = outlined, "fill" = solid, "watermark" = large faded background */
  variant?: "stroke" | "fill" | "watermark"
}

export default function FlaioMonogram({
  size = 32,
  className = "",
  animate = false,
  variant = "stroke",
}: FlaioMonogramProps) {
  const pathRef = useRef<SVGPathElement>(null)

  useEffect(() => {
    if (!animate || !pathRef.current) return

    const path = pathRef.current
    const length = path.getTotalLength()

    path.style.strokeDasharray = `${length}`
    path.style.strokeDashoffset = `${length}`

    // Trigger draw-in animation
    requestAnimationFrame(() => {
      path.style.transition = "stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)"
      path.style.strokeDashoffset = "0"
    })
  }, [animate])

  if (variant === "watermark") {
    return (
      <div className={`flaio-watermark ${className}`} aria-hidden="true">
        <svg
          viewBox="0 0 100 140"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          <path
            d="M28 30 C28 14 36 6 52 6 C60 6 68 8 72 14"
            stroke="var(--color-accent)"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
            opacity="0.04"
          />
          <line
            x1="28" y1="30" x2="28" y2="120"
            stroke="var(--color-accent)"
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.04"
          />
          <line
            x1="10" y1="56" x2="62" y2="56"
            stroke="var(--color-accent)"
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.04"
          />
          {/* Flair dot */}
          <circle
            cx="62" cy="56" r="5"
            fill="var(--color-accent)"
            opacity="0.03"
          />
        </svg>
      </div>
    )
  }

  const isFill = variant === "fill"

  return (
    <svg
      viewBox="0 0 100 140"
      width={size}
      height={size * 1.4}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="FLAIO"
      role="img"
    >
      {/* The "f" — hook at top */}
      <path
        ref={animate ? pathRef : undefined}
        d={
          isFill
            ? "M28 30 C28 14 36 6 52 6 C60 6 68 8 72 14 L72 14 C68 8 60 6 52 6 C36 6 28 14 28 30 L28 120 L28 30 Z"
            : "M28 30 C28 14 36 6 52 6 C60 6 68 8 72 14"
        }
        stroke="currentColor"
        strokeWidth={isFill ? "0" : "5"}
        strokeLinecap="round"
        fill={isFill ? "currentColor" : "none"}
      />

      {/* Vertical stem */}
      {!isFill && (
        <line
          x1="28" y1="30" x2="28" y2="120"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
        />
      )}

      {/* Crossbar */}
      {isFill ? (
        <rect x="10" y="52" width="52" height="8" rx="4" fill="currentColor" />
      ) : (
        <line
          x1="10" y1="56" x2="62" y2="56"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
        />
      )}

      {/* Stem for fill variant */}
      {isFill && (
        <rect x="24" y="28" width="8" height="92" rx="4" fill="currentColor" />
      )}

      {/* Flair dot — the brand accent */}
      <circle
        cx="66" cy="56" r="4"
        fill="var(--color-accent)"
        className="flaio-flair-dot"
      />

      {/* Hook for fill variant */}
      {isFill && (
        <path
          d="M28 30 C28 14 36 6 52 6 C60 6 68 8 72 14 L72 20 C66 12 58 10 52 10 C38 10 32 18 32 30 L28 30 Z"
          fill="currentColor"
        />
      )}
    </svg>
  )
}
