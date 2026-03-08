import { useEffect, useRef, useState } from 'react'
import type { PipelineRegion } from '@/types/translator.types'

interface CanvasOverlayProps {
  regions: PipelineRegion[]
  imageWidth: number    // natural image pixel width
  imageHeight: number   // natural image pixel height
  visible: boolean
}

export function CanvasOverlay({ regions, imageWidth, imageHeight, visible }: CanvasOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 })

  // 1. Track container size (ResizeObserver)
  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      setContainerSize({ w: width, h: height })
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  // 2. Painting Logic
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !imageWidth || !imageHeight) return

    const dpr = window.devicePixelRatio || 1
    const displayW = containerSize.w || canvas.getBoundingClientRect().width
    const displayH = containerSize.h || canvas.getBoundingClientRect().height

    // Setup high-DPI canvas
    canvas.width = displayW * dpr
    canvas.height = displayH * dpr
    const ctx = canvas.getContext('2d')!
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, displayW, displayH)

    if (!visible || !regions.length) return

    // Scale factors
    const scaleX = displayW / imageWidth
    const scaleY = displayH / imageHeight

    for (const region of regions) {
      if (!region.bbox) continue

      const [x1, y1, x2, y2] = region.bbox

      // Calculate dimensions in display pixels
      const dx = x1 * scaleX
      const dy = y1 * scaleY
      const dw = (x2 - x1) * scaleX
      const dh = (y2 - y1) * scaleY

      const cx = dx + dw / 2
      const cy = dy + dh / 2

      // -- A. Draw White "Bubble" Background --
      // Using a rounded rectangle looks more natural than a sharp box
      const radius = Math.min(dw, dh) * 0.2
      ctx.beginPath()
      ctx.roundRect(dx, dy, dw, dh, radius)
      ctx.fillStyle = 'white'
      ctx.fill()

      // -- B. Text Fitting Engine --
      const text = region.english || ''
      if (!text) continue

      ctx.fillStyle = '#000000'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      // We try font sizes from largest (32px) down to smallest (10px)
      // until the wrapped text fits entirely within the box height.
      let fontSize = 32
      const minFontSize = 10
      const lineHeightMultiplier = 1.2
      let lines: string[] = []

      while (fontSize >= minFontSize) {
        ctx.font = `${fontSize}px "Comic Sans MS", "Noto Sans", sans-serif`
        const words = text.split(' ')
        lines = []
        let currentLine = words[0]

        // Word Wrap Logic
        for (let i = 1; i < words.length; i++) {
          const word = words[i]
          const width = ctx.measureText(currentLine + " " + word).width
          if (width < dw * 0.9) {
            currentLine += " " + word
          } else {
            lines.push(currentLine)
            currentLine = word
          }
        }
        lines.push(currentLine)

        // Check if total height fits
        const totalHeight = lines.length * (fontSize * lineHeightMultiplier)
        if (totalHeight <= dh * 0.95) {
          // It fits! Break the loop and draw
          break
        }

        // If not, shrink font and try again
        fontSize -= 1
      }

      // -- C. Draw the Centered Text Block --
      const lineHeight = fontSize * lineHeightMultiplier
      const blockHeight = lines.length * lineHeight
      // Start Y = Center Y - Half Block Height + Half Line Height (to adjust for baseline)
      let startY = cy - (blockHeight / 2) + (lineHeight / 2)

      // Use the final calculated font
      ctx.font = `${fontSize}px "Comic Sans MS", "Noto Sans", sans-serif`

      lines.forEach((line, i) => {
        ctx.fillText(line, cx, startY + (i * lineHeight))
      })
    }
  }, [regions, visible, imageWidth, imageHeight, containerSize])

  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ pointerEvents: 'none', zIndex: 10 }}
      />
    </div>
  )
}

export default CanvasOverlay