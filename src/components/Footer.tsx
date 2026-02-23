"use client"

import { AnimatedDivider, FlaioMark, AccentUnderline } from "@/components/brand"

export default function Footer() {
  return (
    <footer className="relative z-10 py-16 px-6">
      <AnimatedDivider className="mb-12" />

      <div className="flex flex-col items-center gap-4">
        <FlaioMark size={40} animate />

        <p
          className="text-muted text-sm tracking-[0.3em] uppercase"
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: "var(--display-weight)" as unknown as number,
          }}
        >
          <AccentUnderline trigger="hover">FLAIO</AccentUnderline>
        </p>
      </div>
    </footer>
  )
}
