import React, { useEffect, useRef } from 'react'

const CHANNEL_COLORS = ['#c084fc', '#34d399', '#e879f9', '#fb923c', '#f472b6', '#facc15']
const DEFAULT_CHANNEL_LABELS = ['FP1-F7', 'F7-T7', 'T7-P7', 'FP2-F8', 'F8-T8', 'T8-P8']

interface Props {
  channels?: number
  height?: number
  speed?: number
  paused?: boolean
  streamedWindow?: number[][] | null
  channelLabels?: string[]
}

export default function EEGWaveform({
  channels = 6,
  height = 360,
  speed = 2,
  paused = false,
  streamedWindow = null,
  channelLabels,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const offsetRef = useRef(0)
  const animRef = useRef<number>(0)
  const streamStartMsRef = useRef<number>(Date.now())

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * 2
      canvas.height = height * 2
      ctx.scale(2, 2)
    }
    resize()
    window.addEventListener('resize', resize)
    streamStartMsRef.current = Date.now()

    const draw = () => {
      const w = canvas.width / 2
      const h = height
      const chHeight = h / channels
      const chPadding = 8

      ctx.clearRect(0, 0, w, h)

      for (let ch = 0; ch < channels; ch++) {
        const yBase = ch * chHeight + chHeight / 2
        const amplitude = chHeight / 2 - chPadding

        // channel label
        ctx.fillStyle = 'rgba(148, 163, 184, 0.6)'
        ctx.font = '10px JetBrains Mono, monospace'
        ctx.fillText(channelLabels?.[ch] || DEFAULT_CHANNEL_LABELS[ch] || `Channel ${ch + 1}`, 4, ch * chHeight + 14)

        // divider line
        if (ch > 0) {
          ctx.strokeStyle = 'rgba(55, 65, 81, 0.4)'
          ctx.lineWidth = 0.5
          ctx.beginPath()
          ctx.moveTo(0, ch * chHeight)
          ctx.lineTo(w, ch * chHeight)
          ctx.stroke()
        }

        // waveform
        ctx.strokeStyle = CHANNEL_COLORS[ch % CHANNEL_COLORS.length]
        ctx.lineWidth = 1.2
        ctx.beginPath()

        if (streamedWindow && streamedWindow.length > 0 && Array.isArray(streamedWindow[0])) {
          const sampleCount = streamedWindow.length
          const elapsedSec = (Date.now() - streamStartMsRef.current) / 1000
          const playhead = (elapsedSec * 256) % sampleCount
          const samplesPerPixel = sampleCount / Math.max(w, 1)
          const maxAbs = Math.max(
            1e-9,
            ...streamedWindow.map((row) => Math.abs(Number(row?.[ch] ?? 0)))
          )

          for (let x = 0; x < w; x++) {
            let idxFloat = playhead - (w - 1 - x) * samplesPerPixel
            while (idxFloat < 0) idxFloat += sampleCount
            const idx = Math.floor(idxFloat) % sampleCount
            const val = Number(streamedWindow[idx]?.[ch] ?? 0)
            const norm = val / maxAbs
            const y = yBase - norm * amplitude * 0.9
            if (x === 0) ctx.moveTo(x, y)
            else ctx.lineTo(x, y)
          }
        } else {
          const baseFreq = 4 + ch * 1.5
          const noiseAmp = 0.3

          for (let x = 0; x < w; x++) {
            const t = (x + offsetRef.current) * 0.02
            const signal =
              Math.sin(t * baseFreq) * 0.4 +
              Math.sin(t * baseFreq * 2.3) * 0.2 +
              Math.sin(t * baseFreq * 0.7) * 0.15 +
              Math.sin(t * 11 + ch) * 0.1 +
              (Math.random() - 0.5) * noiseAmp

            const y = yBase + signal * amplitude
            if (x === 0) ctx.moveTo(x, y)
            else ctx.lineTo(x, y)
          }
        }
        ctx.stroke()
      }

      if (!paused) {
        offsetRef.current += speed
      }
      animRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animRef.current)
    }
  }, [channelLabels, channels, height, paused, speed, streamedWindow])

  return (
    <div className="relative rounded-xl bg-bg border border-gray-800/50 overflow-hidden">
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: `${height}px` }}
        className="block"
      />
      {paused && (
        <div className="absolute inset-0 flex items-center justify-center bg-bg/60 backdrop-blur-sm">
          <span className="text-sm text-slate-400 font-medium">Paused</span>
        </div>
      )}
    </div>
  )
}
