export type ImageFormat = 'image/webp' | 'image/jpeg' | 'image/png'

export type ImageSkimOptions = {
  maxEdge: number // longest side in px
  quality: number // 0..1
  format: ImageFormat
  grayscale: boolean
}

export type SkimmedImage = {
  url: string
  blob: Blob
  width: number
  height: number
}

export function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not decode image'))
    }
    img.src = url
  })
}

export async function skimImage(
  img: HTMLImageElement,
  opts: ImageSkimOptions,
): Promise<SkimmedImage> {
  const { naturalWidth: w, naturalHeight: h } = img
  const scale = Math.min(1, opts.maxEdge / Math.max(w, h))
  const width = Math.max(1, Math.round(w * scale))
  const height = Math.max(1, Math.round(h * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas not supported')
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  if (opts.format === 'image/jpeg') {
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, width, height)
  }
  if (opts.grayscale) ctx.filter = 'grayscale(1)'
  ctx.drawImage(img, 0, 0, width, height)

  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Encoding failed'))),
      opts.format,
      opts.quality,
    ),
  )
  return { url: URL.createObjectURL(blob), blob, width, height }
}
