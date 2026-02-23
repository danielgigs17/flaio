"use client"

/**
 * Gradient blobs using radial-gradient instead of filter: blur().
 * The blur look is achieved by the gradient falloff itself — no paint-heavy
 * CSS filters needed. Animations use only transform (GPU-composited).
 */
export default function GradientBlobs() {
  return (
    <div className="flaio-blobs" aria-hidden="true">
      <div className="flaio-blob flaio-blob-1" />
      <div className="flaio-blob flaio-blob-2" />
      <div className="flaio-blob flaio-blob-3" />
    </div>
  )
}
