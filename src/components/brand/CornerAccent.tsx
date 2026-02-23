"use client"

import { useDesignTheme, type DesignTheme } from "@/hooks/useDesignTheme"

interface CornerAccentProps {
  children: React.ReactNode
  className?: string
  size?: number
}

function CornerSVG({
  position,
  size,
  theme,
}: {
  position: "tl" | "tr" | "bl" | "br"
  size: number
  theme: DesignTheme
}) {
  const flipX = position === "tr" || position === "br"
  const flipY = position === "bl" || position === "br"
  const transform = `scale(${flipX ? -1 : 1}, ${flipY ? -1 : 1})`

  const posStyle: React.CSSProperties = {
    position: "absolute",
    width: size,
    height: size,
    ...(position.includes("t") ? { top: -1 } : { bottom: -1 }),
    ...(position.includes("l") ? { left: -1 } : { right: -1 }),
    pointerEvents: "none",
  }

  const renderCorner = () => {
    switch (theme) {
      case "editorial":
        // Elegant thin serif bracket
        return (
          <svg viewBox="0 0 24 24" fill="none" style={posStyle}>
            <g style={{ transform, transformOrigin: "12px 12px" }}>
              <path
                d="M2 22 L2 6 Q2 2 6 2 L22 2"
                stroke="var(--color-accent)"
                strokeWidth="1"
                opacity="0.3"
                fill="none"
              />
              <circle cx="2" cy="22" r="1.5" fill="var(--color-accent)" opacity="0.2" />
            </g>
          </svg>
        )

      case "terminal":
        // Code bracket / pipe corner
        return (
          <svg viewBox="0 0 24 24" fill="none" style={posStyle}>
            <g style={{ transform, transformOrigin: "12px 12px" }}>
              <path
                d="M2 20 L2 2 L20 2"
                stroke="var(--color-accent)"
                strokeWidth="1.5"
                opacity="0.4"
                strokeDasharray="4 3"
                fill="none"
              />
            </g>
          </svg>
        )

      case "cyberpunk":
        // Angled neon cut
        return (
          <svg viewBox="0 0 24 24" fill="none" style={posStyle}>
            <g style={{ transform, transformOrigin: "12px 12px" }}>
              <path
                d="M2 16 L2 6 L6 2 L16 2"
                stroke="var(--color-accent)"
                strokeWidth="1.5"
                opacity="0.5"
                fill="none"
              />
              <path
                d="M2 16 L2 6 L6 2 L16 2"
                stroke="var(--color-accent)"
                strokeWidth="1.5"
                opacity="0.2"
                fill="none"
                filter="blur(4px)"
              />
            </g>
          </svg>
        )

      case "minimal":
        // Subtle rounded arc
        return (
          <svg viewBox="0 0 24 24" fill="none" style={posStyle}>
            <g style={{ transform, transformOrigin: "12px 12px" }}>
              <path
                d="M2 14 Q2 2 14 2"
                stroke="var(--color-muted)"
                strokeWidth="0.5"
                opacity="0.2"
                fill="none"
              />
            </g>
          </svg>
        )

      case "brutalist":
        // Thick L-shape
        return (
          <svg viewBox="0 0 24 24" fill="none" style={posStyle}>
            <g style={{ transform, transformOrigin: "12px 12px" }}>
              <path
                d="M1 22 L1 1 L22 1"
                stroke="var(--color-ink)"
                strokeWidth="3"
                opacity="0.6"
                fill="none"
              />
            </g>
          </svg>
        )

      case "retro":
        // Pixelated steps
        return (
          <svg viewBox="0 0 24 24" fill="none" style={posStyle}>
            <g style={{ transform, transformOrigin: "12px 12px" }}>
              <path
                d="M2 20 L2 10 L6 10 L6 6 L10 6 L10 2 L20 2"
                stroke="var(--color-accent)"
                strokeWidth="1.5"
                opacity="0.35"
                fill="none"
              />
            </g>
          </svg>
        )
    }
  }

  return renderCorner()
}

export default function CornerAccent({
  children,
  className = "",
  size = 24,
}: CornerAccentProps) {
  const theme = useDesignTheme()

  return (
    <div className={`relative ${className}`}>
      <CornerSVG position="tl" size={size} theme={theme} />
      <CornerSVG position="tr" size={size} theme={theme} />
      <CornerSVG position="bl" size={size} theme={theme} />
      <CornerSVG position="br" size={size} theme={theme} />
      {children}
    </div>
  )
}
