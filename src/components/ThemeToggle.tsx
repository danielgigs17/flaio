"use client"

import { useTheme } from "next-themes"
import { useEffect, useState, useRef } from "react"

const COLOR_THEMES = [
  { id: "editorial", label: "Editorial", desc: "Serif luxury", swatch: "#B8A082" },
  { id: "terminal", label: "Terminal", desc: "Hacker green", swatch: "#00FF41" },
  { id: "cyberpunk", label: "Cyberpunk", desc: "Neon future", swatch: "#FF2E97" },
  { id: "apple", label: "Apple", desc: "Clean & minimal", swatch: "#0071E3" },
  { id: "brutalist", label: "Brutalist", desc: "Raw & loud", swatch: "#FF0000" },
  { id: "retro", label: "Retro", desc: "CRT amber", swatch: "#FFB000" },
] as const

export default function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [colorTheme, setColorTheme] = useState("editorial")
  const [isOpen, setIsOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem("flaio-color-theme") || "editorial"
    setColorTheme(saved)
    document.documentElement.setAttribute("data-theme", saved)
  }, [])

  useEffect(() => {
    if (!isOpen) return
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [isOpen])

  if (!mounted) return <div className="w-9 h-9" />

  const isDark = resolvedTheme === "dark"

  const handleColorTheme = (id: string) => {
    setColorTheme(id)
    localStorage.setItem("flaio-color-theme", id)
    document.documentElement.setAttribute("data-theme", id)
  }

  const currentSwatch = COLOR_THEMES.find((t) => t.id === colorTheme)?.swatch

  return (
    <div ref={panelRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-9 h-9 flex items-center justify-center rounded-full border border-hairline text-muted hover:text-ink hover:border-ink/20 transition-colors"
        aria-label="Theme settings"
      >
        <div
          className="w-4 h-4 rounded-full border-2 border-current"
          style={{ backgroundColor: currentSwatch }}
        />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-12 w-64 border border-hairline bg-page shadow-lg p-4 z-50"
          style={{ borderRadius: "var(--card-radius)" }}
        >
          {/* Dark/Light toggle */}
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-hairline">
            <span
              className="text-[10px] uppercase tracking-widest text-muted"
              style={{ fontFamily: "var(--font-body)" }}
            >
              Mode
            </span>
            <button
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className="flex items-center gap-2 text-sm text-ink hover:text-accent transition-colors"
              style={{ fontFamily: "var(--font-body)" }}
            >
              {isDark ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="5" />
                    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                  </svg>
                  Light
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </svg>
                  Dark
                </>
              )}
            </button>
          </div>

          {/* Color themes */}
          <span
            className="text-[10px] uppercase tracking-widest text-muted block mb-3"
            style={{ fontFamily: "var(--font-body)" }}
          >
            Vibe
          </span>
          <div className="space-y-1">
            {COLOR_THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => handleColorTheme(t.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 transition-colors ${
                  colorTheme === t.id ? "bg-sand/60" : "hover:bg-sand/30"
                }`}
                style={{ borderRadius: "var(--card-radius)" }}
              >
                <div
                  className="w-4 h-4 rounded-full flex-shrink-0 border-2 transition-all"
                  style={{
                    backgroundColor: t.swatch,
                    borderColor:
                      colorTheme === t.id ? "var(--color-ink)" : "transparent",
                  }}
                />
                <div className="text-left">
                  <span
                    className="text-sm text-ink block leading-tight"
                    style={{ fontFamily: "var(--font-body)" }}
                  >
                    {t.label}
                  </span>
                  <span
                    className="text-[10px] text-muted leading-tight"
                    style={{ fontFamily: "var(--font-body)" }}
                  >
                    {t.desc}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
