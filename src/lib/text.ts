// Deterministic, local text "skimming" passes. No AI calls — everything runs in the browser.

export type TextMode = 'prose' | 'code' | 'json'

export type TextOptions = {
  collapseWhitespace: boolean
  stripMarkdown: boolean
  removeFiller: boolean
  dedupeLines: boolean
  stripComments: boolean
  dropStopwords: boolean
}

export const defaultTextOptions: TextOptions = {
  collapseWhitespace: true,
  stripMarkdown: false,
  removeFiller: true,
  dedupeLines: true,
  stripComments: true,
  dropStopwords: false,
}

const FILLER_PHRASES = [
  'basically',
  'actually',
  'literally',
  'really',
  'very',
  'just',
  'simply',
  'quite',
  'kind of',
  'sort of',
  'in order to',
  'it is important to note that',
  'it should be noted that',
  'please note that',
  'as a matter of fact',
  'at the end of the day',
  'for what it\'s worth',
  'needless to say',
  'i think that',
  'i believe that',
  'in my opinion',
  'you know',
  'i mean',
]

const REPLACEMENTS: [RegExp, string][] = [
  [/\bin order to\b/gi, 'to'],
  [/\bdue to the fact that\b/gi, 'because'],
  [/\bat this point in time\b/gi, 'now'],
  [/\bin the event that\b/gi, 'if'],
  [/\bwith regard to\b/gi, 'about'],
  [/\bwith respect to\b/gi, 'about'],
  [/\ba large number of\b/gi, 'many'],
  [/\bthe majority of\b/gi, 'most'],
  [/\bis able to\b/gi, 'can'],
  [/\bare able to\b/gi, 'can'],
  [/\bfor example\b/gi, 'e.g.'],
  [/\bthat is to say\b/gi, 'i.e.'],
  [/\band so on\b/gi, 'etc.'],
]

const STOPWORDS = new Set(
  'a an the of to is are was were be been being am that this these those it its there here which who whom then than so such and'.split(
    ' ',
  ),
)

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const fillerRe = new RegExp(
  `\\b(?:${FILLER_PHRASES.filter((p) => p !== 'in order to')
    .map(escapeRe)
    .join('|')})\\b,?\\s*`,
  'gi',
)

function stripMarkdown(s: string): string {
  return s
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1') // images
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // links
    .replace(/^#{1,6}\s+/gm, '') // headings
    .replace(/(\*\*|__)(.*?)\1/g, '$2') // bold
    .replace(/(\*|_)(.*?)\1/g, '$2') // italic
    .replace(/^>\s?/gm, '') // quotes
    .replace(/^[-*_]{3,}\s*$/gm, '') // hr
    .replace(/`([^`]+)`/g, '$1')
}

function stripCodeComments(s: string): string {
  return s
    .replace(/\/\*[\s\S]*?\*\//g, '') // block comments
    .replace(/(^|[^:"'`])\/\/.*$/gm, '$1') // line comments (avoid URLs)
    .replace(/^\s*#(?!!).*$/gm, '') // shell / python comments (keep shebang)
    .replace(/<!--[\s\S]*?-->/g, '')
}

function dedupe(s: string): string {
  const seen = new Set<string>()
  return s
    .split('\n')
    .filter((line) => {
      const key = line.trim().toLowerCase()
      if (!key) return true
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .join('\n')
}

function collapse(s: string, keepIndent: boolean): string {
  let out = s.replace(/\r\n?/g, '\n').replace(/[ \t]+$/gm, '')
  out = keepIndent
    ? out.replace(/\n{2,}/g, '\n')
    : out.replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n')
  return out.trim()
}

function compactJson(input: string): string {
  const data = JSON.parse(input)
  // Arrays of flat objects → header row + value rows (much cheaper than repeated keys).
  if (
    Array.isArray(data) &&
    data.length > 1 &&
    data.every((r) => r && typeof r === 'object' && !Array.isArray(r))
  ) {
    const keys = Array.from(new Set(data.flatMap((r) => Object.keys(r))))
    const flat = data.every((r) =>
      Object.values(r).every((v) => v === null || typeof v !== 'object'),
    )
    if (flat) {
      const cell = (v: unknown) => {
        if (v === null || v === undefined) return ''
        const s = String(v)
        return /[|\n]/.test(s) ? JSON.stringify(s) : s
      }
      return [keys.join('|'), ...data.map((r) => keys.map((k) => cell(r[k])).join('|'))].join('\n')
    }
  }
  return JSON.stringify(data)
}

export function skimText(input: string, mode: TextMode, o: TextOptions): string {
  if (!input.trim()) return ''

  if (mode === 'json') {
    try {
      return compactJson(input)
    } catch {
      // fall through to treat as prose if it isn't valid JSON
    }
  }

  let s = input

  if (mode === 'code') {
    if (o.stripComments) s = stripCodeComments(s)
    if (o.collapseWhitespace) s = collapse(s, true)
    return s
  }

  if (o.stripMarkdown) s = stripMarkdown(s)
  if (o.removeFiller) {
    for (const [re, rep] of REPLACEMENTS) s = s.replace(re, rep)
    s = s.replace(fillerRe, '')
  }
  if (o.dropStopwords) {
    s = s
      .split('\n')
      .map((line) =>
        line
          .split(/(\s+)/)
          .filter((tok) => !STOPWORDS.has(tok.toLowerCase().replace(/[^a-z]/g, '')) || !tok.trim())
          .join(''),
      )
      .join('\n')
  }
  if (o.dedupeLines) s = dedupe(s)
  if (o.collapseWhitespace) s = collapse(s, false)
  // Fix "  ," / " ." left behind by removals & re-capitalize sentence starts.
  s = s
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/[,;:]+([.!?])/g, '$1')
    .replace(/(^|[.!?]\s+|\n[ \t]*)([a-z])/g, (_, a, b) => a + b.toUpperCase())
  return s
}
