"use client"

import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import type { Project, AppPreview } from "@/data/projects"

interface ProjectPanelProps {
  project: Project
}

function AppIcon({ app, accentHue }: { app: AppPreview; accentHue: number }) {
  const [imgFailed, setImgFailed] = useState(false)
  const showImg = app.iconImage && !imgFailed

  return (
    <a
      key={app.name}
      href={app.href}
      className="flex flex-col items-center gap-1.5 group/app"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="w-14 h-14 md:w-16 md:h-16 flex items-center justify-center overflow-hidden shadow-sm group-hover/app:shadow-md transition-shadow"
        style={{
          borderRadius: "22%",
          background: `linear-gradient(145deg, hsla(${accentHue}, 35%, 55%, 0.15), hsla(${accentHue}, 25%, 45%, 0.08))`,
        }}
      >
        {showImg ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={app.iconImage}
            alt={app.name}
            className="w-full h-full object-cover"
            style={{ borderRadius: "22%" }}
            onError={() => setImgFailed(true)}
          />
        ) : (
          <span className="text-2xl">{app.icon}</span>
        )}
      </div>
      <span
        className="text-[11px] text-muted font-medium text-center leading-tight"
        style={{ fontFamily: "var(--font-body)" }}
      >
        {app.name}
      </span>
    </a>
  )
}

function ScreenshotPreview({ src, alt, icon, accentHue }: { src: string; alt: string; icon: string; accentHue: number }) {
  const [imgFailed, setImgFailed] = useState(false)

  return (
    <div
      className="relative w-full h-32 md:h-40 overflow-hidden"
      style={{
        background: `linear-gradient(135deg, hsla(${accentHue}, 40%, 60%, 0.15), hsla(${accentHue}, 30%, 40%, 0.08))`,
      }}
    >
      {!imgFailed && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={src}
          alt={alt}
          className="absolute inset-0 w-full h-full object-cover object-top"
          onError={() => setImgFailed(true)}
        />
      )}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span
          className="text-5xl opacity-20"
          style={{
            filter: `hue-rotate(${accentHue}deg)`,
          }}
        >
          {icon}
        </span>
      </div>
      <div
        className="absolute bottom-0 left-0 right-0 h-12"
        style={{
          background:
            "linear-gradient(to top, var(--color-sand), transparent)",
        }}
      />
    </div>
  )
}

export default function ProjectPanel({ project }: ProjectPanelProps) {
  return (
    <div className="w-full max-w-2xl mx-auto mt-12 md:mt-16">
      <AnimatePresence mode="wait">
        <motion.div
          key={project.word}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >

          <a
            href={project.href}
            className="project-card group block border border-hairline bg-sand/40 transition-colors hover:bg-sand/70 overflow-hidden"
            style={{
              borderRadius: "var(--card-radius)",
              borderColor: `hsla(${project.accentHue}, 30%, 50%, 0.15)`,
            }}
          >
            {/* Screenshot preview area */}
            {project.screenshot && (
              <ScreenshotPreview
                src={project.screenshot}
                alt={`${project.name} preview`}
                icon={project.icon}
                accentHue={project.accentHue}
              />
            )}

            <div className="p-6 md:p-8">
              {/* Header row */}
              <div className="flex items-start gap-5">
                {/* Icon */}
                <span
                  className="flex-shrink-0 flex items-center justify-center w-12 h-12 text-2xl"
                  style={{
                    borderRadius: "var(--card-radius)",
                    background: `hsla(${project.accentHue}, 30%, 50%, 0.1)`,
                  }}
                >
                  {project.icon}
                </span>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-3 mb-1">
                    <h2
                      className="text-xl md:text-2xl text-ink"
                      style={{
                        fontFamily: "var(--font-display)",
                        fontWeight:
                          "var(--display-weight)" as unknown as number,
                      }}
                    >
                      {project.name}
                    </h2>
                    <span
                      className="text-xs uppercase tracking-widest"
                      style={{
                        fontFamily: "var(--font-body)",
                        color: `hsl(${project.accentHue}, 30%, 50%)`,
                      }}
                    >
                      {project.word}
                    </span>
                  </div>
                  <p
                    className="text-muted text-sm md:text-base leading-relaxed"
                    style={{ fontFamily: "var(--font-body)" }}
                  >
                    {project.description}
                  </p>
                </div>

                {/* Arrow */}
                <span className="flex-shrink-0 text-muted group-hover:text-ink transition-colors mt-1">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    className="translate-x-0 group-hover:translate-x-1 transition-transform"
                  >
                    <path
                      d="M4 10h12m0 0l-4-4m4 4l-4 4"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </div>

              {/* App icons grid (iOS-style) */}
              {project.apps && project.apps.length > 0 && (
                <div className="mt-5 flex items-start gap-6 justify-center">
                  {project.apps.map((app) => (
                    <AppIcon key={app.name} app={app} accentHue={project.accentHue} />
                  ))}
                </div>
              )}

              {/* Tags */}
              {project.tags && project.tags.length > 0 && (
                <div className="mt-4 flex items-center gap-2 flex-wrap">
                  {project.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full text-muted/70"
                      style={{
                        fontFamily: "var(--font-body)",
                        background: `hsla(${project.accentHue}, 20%, 50%, 0.08)`,
                        border: `1px solid hsla(${project.accentHue}, 20%, 50%, 0.1)`,
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Link label */}
              <div className="mt-4 flex justify-end">
                <span
                  className="text-xs uppercase tracking-widest text-muted group-hover:text-accent transition-colors"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  {project.linkLabel}
                </span>
              </div>
            </div>
          </a>

        </motion.div>
      </AnimatePresence>
    </div>
  )
}
