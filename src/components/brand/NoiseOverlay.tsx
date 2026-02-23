"use client"

import { useRef, useEffect } from "react"

/**
 * Generates a static noise texture once via canvas, then displays it as a
 * CSS background-image. This avoids the catastrophic performance cost of
 * a live SVG feTurbulence filter that re-renders every frame.
 */
export default function NoiseOverlay() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const size = 200 // small tile, repeated
    const canvas = document.createElement("canvas")
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const imageData = ctx.createImageData(size, size)
    const data = imageData.data
    for (let i = 0; i < data.length; i += 4) {
      const v = Math.random() * 255
      data[i] = v
      data[i + 1] = v
      data[i + 2] = v
      data[i + 3] = 255
    }
    ctx.putImageData(imageData, 0, 0)

    el.style.backgroundImage = `url(${canvas.toDataURL("image/png")})`
    el.style.backgroundRepeat = "repeat"
  }, [])

  return (
    <div
      ref={ref}
      className="flaio-noise"
      aria-hidden="true"
    />
  )
}
