import { useCallback, useEffect, useRef, useState } from 'react'
import { loadImage, skimImage, type ImageFormat, type SkimmedImage } from '../lib/image'
import { estimateImageTokens, formatBytes, pctSaved } from '../lib/tokens'

const PRESETS = [
  { id: 'tiny', label: 'Tiny', edge: 384, hint: 'Gemini single tile' },
  { id: 'lean', label: 'Lean', edge: 768, hint: 'Readable text & UI' },
  { id: 'detail', label: 'Detail', edge: 1152, hint: 'Fine diagrams' },
] as const

type Source = { file: File; img: HTMLImageElement; url: string }

export default function ImageSkimmer() {
  const [src, setSrc] = useState<Source | null>(null)
  const [out, setOut] = useState<SkimmedImage | null>(null)
  const [edge, setEdge] = useState(768)
  const [quality, setQuality] = useState(0.7)
  const [format, setFormat] = useState<ImageFormat>('image/webp')
  const [grayscale, setGrayscale] = useState(false)
  const [drag, setDrag] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const accept = useCallback(async (file?: File | null) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('That isn’t an image file.')
      return
    }
    setError(null)
    try {
      const img = await loadImage(file)
      setSrc((prev) => {
        if (prev) URL.revokeObjectURL(prev.url)
        return { file, img, url: img.src }
      })
    } catch (e) {
      setError((e as Error).message)
    }
  }, [])

  // paste from clipboard anywhere on the page
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const item = Array.from(e.clipboardData?.items ?? []).find((i) => i.type.startsWith('image/'))
      if (item) accept(item.getAsFile())
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [accept])

  // re-encode whenever settings change
  useEffect(() => {
    if (!src) return
    let cancelled = false
    const id = setTimeout(async () => {
      const result = await skimImage(src.img, { maxEdge: edge, quality, format, grayscale })
      if (cancelled) return URL.revokeObjectURL(result.url)
      setOut((prev) => {
        if (prev) URL.revokeObjectURL(prev.url)
        return result
      })
    }, 80)
    return () => {
      cancelled = true
      clearTimeout(id)
    }
  }, [src, edge, quality, format, grayscale])

  const before = src ? estimateImageTokens(src.img.naturalWidth, src.img.naturalHeight) : null
  const after = out ? estimateImageTokens(out.width, out.height) : null

  const download = () => {
    if (!out || !src) return
    const ext = format.split('/')[1]
    const a = document.createElement('a')
    a.href = out.url
    a.download = `${src.file.name.replace(/\.[^.]+$/, '')}.skimmy.${ext}`
    a.click()
  }

  const copy = async () => {
    if (!out || !src) return
    try {
      // Clipboard only reliably accepts PNG.
      const png =
        format === 'image/png'
          ? out.blob
          : (await skimImage(src.img, { maxEdge: edge, quality, format: 'image/png', grayscale })).blob
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })])
      setCopied(true)
      setTimeout(() => setCopied(false), 1400)
    } catch {
      setError('Clipboard blocked — use Download instead.')
    }
  }

  return (
    <div className="grid lg:grid-cols-2">
      {/* LEFT — input + controls */}
      <div className="flex flex-col border-b border-line lg:border-r lg:border-b-0">
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setDrag(true)
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDrag(false)
            accept(e.dataTransfer.files?.[0])
          }}
          className={`checker relative flex aspect-[16/10] cursor-pointer items-center justify-center overflow-hidden border-b border-line transition-colors ${
            drag ? 'outline outline-1 -outline-offset-8 outline-fg/60' : ''
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => accept(e.target.files?.[0])}
          />
          {src ? (
            <img src={src.url} alt="original" className="max-h-full max-w-full object-contain" />
          ) : (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full border border-line text-muted">
                ↑
              </div>
              <p className="text-sm text-fg">Drop, paste or click to add an image</p>
              <p className="mt-1 font-mono text-xs text-dim">PNG · JPG · WEBP · HEIC*</p>
            </div>
          )}
          {src && (
            <span className="eyebrow absolute top-3 left-3 rounded bg-black/70 px-2 py-1 backdrop-blur">
              original · {src.img.naturalWidth} × {src.img.naturalHeight} · {formatBytes(src.file.size)}
            </span>
          )}
        </div>

        <div className="space-y-6 p-5">
          <div>
            <p className="eyebrow mb-3">Preset</p>
            <div className="grid grid-cols-3 gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setEdge(p.edge)}
                  className={`rounded-lg border px-3 py-2.5 text-left transition-colors ${
                    edge === p.edge
                      ? 'border-line-strong bg-hover'
                      : 'border-line hover:bg-white/[0.03]'
                  }`}
                >
                  <div className="text-sm font-medium">{p.label}</div>
                  <div className="font-mono text-[11px] text-dim">{p.edge}px · {p.hint}</div>
                </button>
              ))}
            </div>
          </div>

          <Slider
            label="Longest edge"
            value={`${edge}px`}
            min={128}
            max={2048}
            step={16}
            v={edge}
            onChange={setEdge}
          />
          <Slider
            label="Quality"
            value={format === 'image/png' ? 'lossless' : `${Math.round(quality * 100)}`}
            min={0.2}
            max={1}
            step={0.05}
            v={quality}
            onChange={setQuality}
            disabled={format === 'image/png'}
          />

          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <div className="flex items-center gap-1 rounded-md border border-line p-0.5">
              {(['image/webp', 'image/jpeg', 'image/png'] as ImageFormat[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className={`rounded px-2.5 py-1 font-mono text-xs uppercase transition-colors ${
                    format === f ? 'bg-fg text-black' : 'text-muted hover:text-fg'
                  }`}
                >
                  {f.split('/')[1]}
                </button>
              ))}
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-muted select-none">
              <input
                type="checkbox"
                checked={grayscale}
                onChange={(e) => setGrayscale(e.target.checked)}
                className="accent-white"
              />
              Grayscale
            </label>
          </div>
          {error && <p className="font-mono text-xs text-bad">{error}</p>}
        </div>
      </div>

      {/* RIGHT — result */}
      <div className="flex flex-col">
        <div className="checker relative flex aspect-[16/10] items-center justify-center overflow-hidden border-b border-line">
          {out ? (
            <img
              key={out.url}
              src={out.url}
              alt="skimmed"
              className="reveal max-h-full max-w-full object-contain"
              style={{ imageRendering: out.width < 400 ? 'pixelated' : 'auto' }}
            />
          ) : (
            <p className="font-mono text-xs text-dim">result appears here</p>
          )}
          {out && (
            <span className="eyebrow absolute top-3 left-3 rounded bg-black/70 px-2 py-1 backdrop-blur">
              skimmed · {out.width} × {out.height} · {formatBytes(out.blob.size)}
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col p-5">
          <p className="eyebrow mb-3">Estimated input tokens</p>
          <div className="divide-y divide-line rounded-lg border border-line">
            {(['claude', 'openai', 'gemini'] as const).map((k) => (
              <div key={k} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-4 py-3">
                <span className="text-sm capitalize">{k === 'openai' ? 'GPT (high detail)' : k}</span>
                <span className="font-mono text-sm text-dim tabular-nums line-through decoration-dim/60">
                  {before ? before[k].toLocaleString() : '—'}
                </span>
                <span className="font-mono text-sm tabular-nums">
                  {after ? after[k].toLocaleString() : '—'}
                </span>
                <span
                  className={`w-14 rounded-full px-2 py-0.5 text-center font-mono text-[11px] ${
                    before && after && pctSaved(before[k], after[k]) > 0
                      ? 'bg-ok/10 text-ok'
                      : 'bg-white/5 text-dim'
                  }`}
                >
                  −{before && after ? pctSaved(before[k], after[k]) : 0}%
                </span>
              </div>
            ))}
          </div>

          <div className="mt-auto flex items-center justify-between gap-3 pt-6">
            <span className="font-mono text-xs text-dim">
              {src && out ? `${pctSaved(src.file.size, out.blob.size)}% smaller file` : 'nothing loaded'}
            </span>
            <div className="flex gap-2">
              <button className="btn" onClick={copy} disabled={!out}>
                {copied ? 'Copied ✓' : 'Copy'}
              </button>
              <button className="btn-solid" onClick={download} disabled={!out}>
                Download
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Slider(props: {
  label: string
  value: string
  min: number
  max: number
  step: number
  v: number
  onChange: (n: number) => void
  disabled?: boolean
}) {
  return (
    <div className={props.disabled ? 'opacity-40' : ''}>
      <div className="mb-2.5 flex items-center justify-between">
        <span className="eyebrow">{props.label}</span>
        <span className="font-mono text-xs text-fg tabular-nums">{props.value}</span>
      </div>
      <input
        type="range"
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.v}
        disabled={props.disabled}
        onChange={(e) => props.onChange(Number(e.target.value))}
      />
    </div>
  )
}
