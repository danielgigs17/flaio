"use client"

import { useState, useEffect } from "react"

export type DesignTheme =
  | "editorial"
  | "terminal"
  | "cyberpunk"
  | "minimal"
  | "brutalist"
  | "retro"

export function useDesignTheme(): DesignTheme {
  const [theme, setTheme] = useState<DesignTheme>("editorial")

  useEffect(() => {
    const update = () => {
      const t = document.documentElement.getAttribute("data-theme") as DesignTheme
      setTheme(t || "editorial")
    }
    update()

    const observer = new MutationObserver(update)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    })
    return () => observer.disconnect()
  }, [])

  return theme
}
