"use client"

interface DotGridProps {
  children: React.ReactNode
  className?: string
}

export default function DotGrid({ children, className = "" }: DotGridProps) {
  return (
    <div className={`flaio-dot-grid relative ${className}`}>
      <div className="flaio-dot-grid-bg absolute inset-0 pointer-events-none" aria-hidden="true" />
      <div className="relative">{children}</div>
    </div>
  )
}
