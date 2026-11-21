// Approximate token cost estimators for popular AI providers.
// These are heuristics based on published pricing docs — good for comparison, not billing.

/** Rough text token estimate (~4 chars per token for English / code). */
export function estimateTextTokens(text: string): number {
  if (!text) return 0
  return Math.max(1, Math.ceil(text.length / 4))
}

export type ImageTokenEstimate = {
  claude: number
  openai: number
  gemini: number
}

/** Claude: tokens ≈ (w * h) / 750, after downscaling so the long edge ≤ 1568px. */
function claudeImageTokens(w: number, h: number): number {
  const scale = Math.min(1, 1568 / Math.max(w, h))
  const sw = Math.round(w * scale)
  const sh = Math.round(h * scale)
  return Math.ceil((sw * sh) / 750)
}

/** OpenAI (high detail): fit in 2048², short side → 768, then 170 per 512px tile + 85 base. */
function openaiImageTokens(w: number, h: number): number {
  let sw = w
  let sh = h
  const fit = Math.min(1, 2048 / Math.max(sw, sh))
  sw *= fit
  sh *= fit
  const shortScale = Math.min(1, 768 / Math.min(sw, sh))
  sw *= shortScale
  sh *= shortScale
  const tiles = Math.ceil(sw / 512) * Math.ceil(sh / 512)
  return 85 + 170 * tiles
}

/** Gemini: 258 tokens if both sides ≤ 384px, otherwise 258 per 768×768 tile. */
function geminiImageTokens(w: number, h: number): number {
  if (w <= 384 && h <= 384) return 258
  const tiles = Math.ceil(w / 768) * Math.ceil(h / 768)
  return 258 * tiles
}

export function estimateImageTokens(w: number, h: number): ImageTokenEstimate {
  return {
    claude: claudeImageTokens(w, h),
    openai: openaiImageTokens(w, h),
    gemini: geminiImageTokens(w, h),
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

export function pctSaved(before: number, after: number): number {
  if (!before) return 0
  return Math.max(0, Math.round((1 - after / before) * 100))
}
