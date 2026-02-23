"use client"

interface AccentUnderlineProps {
  children: React.ReactNode
  className?: string
  /** "hover" = show on hover, "always" = always visible, "animate-in" = animate on mount */
  trigger?: "hover" | "always" | "animate-in"
}

export default function AccentUnderline({
  children,
  className = "",
  trigger = "hover",
}: AccentUnderlineProps) {
  return (
    <span
      className={`flaio-underline flaio-underline-${trigger} ${className}`}
    >
      {children}
    </span>
  )
}
