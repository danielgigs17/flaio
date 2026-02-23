"use client"

import { useDesignTheme, type DesignTheme } from "@/hooks/useDesignTheme"

interface AnimatedDividerProps {
  className?: string
}

function DividerContent({ theme }: { theme: DesignTheme }) {
  switch (theme) {
    case "editorial":
      // Thin line with diamond center
      return (
        <svg className="w-full" height="16" viewBox="0 0 800 16" preserveAspectRatio="none">
          <line x1="0" y1="8" x2="370" y2="8" stroke="var(--color-accent)" strokeWidth="0.5" opacity="0.3" />
          <rect x="392" y="2" width="8" height="8" fill="var(--color-accent)" opacity="0.25" transform="rotate(45 396 6)" />
          <line x1="422" y1="8" x2="800" y2="8" stroke="var(--color-accent)" strokeWidth="0.5" opacity="0.3" />
        </svg>
      )

    case "terminal":
      // Dashed line with blinking cursor
      return (
        <div className="flex items-center gap-0 w-full">
          <div className="flex-1 border-t border-dashed" style={{ borderColor: "var(--color-accent)", opacity: 0.3 }} />
          <span
            className="flaio-divider-cursor text-xs px-2"
            style={{ color: "var(--color-accent)", fontFamily: "var(--font-body)" }}
          >
            _
          </span>
          <div className="flex-1 border-t border-dashed" style={{ borderColor: "var(--color-accent)", opacity: 0.3 }} />
        </div>
      )

    case "cyberpunk":
      // Neon glow line with glitch
      return (
        <div className="flaio-divider-neon relative w-full h-[2px]">
          <div
            className="absolute inset-0"
            style={{ background: "var(--color-accent)", opacity: 0.6 }}
          />
          <div
            className="absolute inset-0"
            style={{
              background: "var(--color-accent)",
              filter: "blur(6px)",
              opacity: 0.4,
            }}
          />
          <div
            className="flaio-divider-glitch absolute inset-0"
            style={{ background: "var(--color-accent)" }}
          />
        </div>
      )

    case "apple":
      // Ultra-thin gradient fade from center
      return (
        <div
          className="w-full h-[0.5px]"
          style={{
            background: "linear-gradient(90deg, transparent, var(--color-hairline), var(--color-muted), var(--color-hairline), transparent)",
          }}
        />
      )

    case "brutalist":
      // Thick black line
      return (
        <div
          className="w-full h-[3px]"
          style={{ background: "var(--color-ink)" }}
        />
      )

    case "retro":
      // Amber dashed with flicker
      return (
        <div className="flaio-divider-flicker flex items-center w-full">
          <div
            className="flex-1 h-[2px]"
            style={{
              backgroundImage: "repeating-linear-gradient(90deg, var(--color-accent) 0px, var(--color-accent) 8px, transparent 8px, transparent 14px)",
              opacity: 0.4,
            }}
          />
        </div>
      )
  }
}

export default function AnimatedDivider({ className = "" }: AnimatedDividerProps) {
  const theme = useDesignTheme()

  return (
    <div className={`flaio-divider w-full px-8 md:px-16 ${className}`} role="separator" aria-hidden="true">
      <DividerContent theme={theme} />
    </div>
  )
}
