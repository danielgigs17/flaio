"use client"

import { useRef, useEffect, useCallback } from "react"
import { useDesignTheme, type DesignTheme } from "@/hooks/useDesignTheme"

interface ParticleConfig {
  count: number
  color: string
  minSize: number
  maxSize: number
  speed: number
  drift: "up" | "down" | "horizontal" | "random"
  shape: "circle" | "square" | "line"
  glow: number
  flicker: boolean
  trail: number
}

const CONFIGS: Record<DesignTheme, ParticleConfig> = {
  editorial: {
    count: 20,
    color: "182, 160, 130",
    minSize: 1,
    maxSize: 2.5,
    speed: 0.25,
    drift: "up",
    shape: "circle",
    glow: 0,
    flicker: false,
    trail: 0,
  },
  terminal: {
    count: 30,
    color: "0, 255, 65",
    minSize: 1,
    maxSize: 2,
    speed: 1.0,
    drift: "down",
    shape: "circle",
    glow: 8,
    flicker: false,
    trail: 0.92,
  },
  cyberpunk: {
    count: 15,
    color: "255, 46, 151",
    minSize: 1,
    maxSize: 3,
    speed: 0.7,
    drift: "horizontal",
    shape: "line",
    glow: 12,
    flicker: false,
    trail: 0.85,
  },
  minimal: {
    count: 5,
    color: "0, 113, 227",
    minSize: 30,
    maxSize: 80,
    speed: 0.1,
    drift: "random",
    shape: "circle",
    glow: 0,
    flicker: false,
    trail: 0,
  },
  brutalist: {
    count: 8,
    color: "255, 0, 0",
    minSize: 3,
    maxSize: 7,
    speed: 0,
    drift: "random",
    shape: "square",
    glow: 0,
    flicker: false,
    trail: 0,
  },
  retro: {
    count: 22,
    color: "255, 176, 0",
    minSize: 1,
    maxSize: 2.5,
    speed: 0.4,
    drift: "up",
    shape: "circle",
    glow: 6,
    flicker: true,
    trail: 0,
  },
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  opacity: number
  baseOpacity: number
  phase: number
}

function createParticle(w: number, h: number, cfg: ParticleConfig): Particle {
  const size = cfg.minSize + Math.random() * (cfg.maxSize - cfg.minSize)
  const baseOpacity = 0.15 + Math.random() * 0.35

  let vx = 0
  let vy = 0
  const s = cfg.speed

  switch (cfg.drift) {
    case "up":
      vx = (Math.random() - 0.5) * s * 0.4
      vy = -(Math.random() * s + s * 0.3)
      break
    case "down":
      vx = (Math.random() - 0.5) * s * 0.3
      vy = Math.random() * s + s * 0.5
      break
    case "horizontal":
      vx = Math.random() * s + s * 0.5
      vy = (Math.random() - 0.5) * s * 0.2
      break
    case "random":
      vx = (Math.random() - 0.5) * s
      vy = (Math.random() - 0.5) * s
      break
  }

  return {
    x: Math.random() * w,
    y: Math.random() * h,
    vx,
    vy,
    size,
    opacity: baseOpacity,
    baseOpacity,
    phase: Math.random() * Math.PI * 2,
  }
}

/**
 * Canvas-based particle system. Performance optimizations:
 * - Throttled to ~30fps instead of 60fps (every other frame skipped)
 * - shadowBlur disabled for themes that don't need glow
 * - Reduced particle counts
 * - Mouse interaction uses cached values (no layout thrashing)
 */
export default function FloatingParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const theme = useDesignTheme()
  const mouseRef = useRef({ x: -1, y: -1 })
  const particlesRef = useRef<Particle[]>([])
  const animRef = useRef<number>(0)
  const frameCount = useRef(0)

  const handleMouseMove = useCallback((e: MouseEvent) => {
    mouseRef.current = { x: e.clientX, y: e.clientY }
  }, [])

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove, { passive: true })
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [handleMouseMove])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d", { alpha: true })
    if (!ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2) // cap at 2x
    const cfg = CONFIGS[theme]

    let W = window.innerWidth
    let H = window.innerHeight

    const resize = () => {
      W = window.innerWidth
      H = window.innerHeight
      canvas.width = W * dpr
      canvas.height = H * dpr
      canvas.style.width = `${W}px`
      canvas.style.height = `${H}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()

    // Initialize particles
    particlesRef.current = Array.from({ length: cfg.count }, () =>
      createParticle(W, H, cfg)
    )

    // Pre-compute fill styles
    const fillStyle = `rgba(${cfg.color}, 1)`
    const minimalFillStyle = `rgba(${cfg.color}, 0.04)`
    const trailClearStyle = cfg.trail > 0
      ? `rgba(${theme === "cyberpunk" ? "10,10,26" : theme === "terminal" ? "13,2,8" : "0,0,0"}, ${1 - cfg.trail})`
      : ""

    const draw = (time: number) => {
      frameCount.current++

      // Throttle to ~30fps: skip every other frame for most themes
      // Terminal and cyberpunk keep 60fps for smooth trails
      if (cfg.trail === 0 && frameCount.current % 2 !== 0) {
        animRef.current = requestAnimationFrame(draw)
        return
      }

      // Trail effect or full clear
      if (cfg.trail > 0) {
        ctx.fillStyle = trailClearStyle
        ctx.fillRect(0, 0, W, H)
      } else {
        ctx.clearRect(0, 0, W, H)
      }

      const mx = mouseRef.current.x
      const my = mouseRef.current.y
      const hasGlow = cfg.glow > 0

      // Set shadow once if needed (avoid per-particle calls)
      if (hasGlow) {
        ctx.shadowColor = `rgba(${cfg.color}, 0.8)`
        ctx.shadowBlur = cfg.glow
      }

      for (const p of particlesRef.current) {
        // Update position
        p.x += p.vx
        p.y += p.vy

        // Mouse parallax (subtle push away)
        if (mx >= 0 && cfg.shape !== "square") {
          const dx = p.x - mx
          const dy = p.y - my
          const distSq = dx * dx + dy * dy
          if (distSq < 40000 && distSq > 0) { // 200^2 = 40000
            const dist = Math.sqrt(distSq)
            const force = (200 - dist) / 200 * 0.15
            p.x += (dx / dist) * force
            p.y += (dy / dist) * force
          }
        }

        // Wrap around edges
        if (p.x < -p.size * 2) p.x = W + p.size
        if (p.x > W + p.size * 2) p.x = -p.size
        if (p.y < -p.size * 2) p.y = H + p.size
        if (p.y > H + p.size * 2) p.y = -p.size

        // Flicker effect
        let opacity = p.baseOpacity
        if (cfg.flicker) {
          opacity *= 0.5 + 0.5 * Math.sin(time * 0.003 + p.phase * 10)
        }

        ctx.globalAlpha = opacity

        if (cfg.shape === "circle") {
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
          ctx.fillStyle = theme === "minimal" ? minimalFillStyle : fillStyle
          ctx.fill()
        } else if (cfg.shape === "square") {
          ctx.fillStyle = fillStyle
          ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size)
        } else if (cfg.shape === "line") {
          ctx.strokeStyle = fillStyle
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(p.x, p.y)
          ctx.lineTo(p.x + p.vx * 8, p.y + p.vy * 8)
          ctx.stroke()
        }
      }

      ctx.globalAlpha = 1
      if (hasGlow) {
        ctx.shadowBlur = 0
      }

      animRef.current = requestAnimationFrame(draw)
    }

    // Respect reduced motion
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    if (!mq.matches) {
      animRef.current = requestAnimationFrame(draw)
    }

    window.addEventListener("resize", resize, { passive: true })
    return () => {
      cancelAnimationFrame(animRef.current)
      window.removeEventListener("resize", resize)
    }
  }, [theme])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      aria-hidden="true"
    />
  )
}
