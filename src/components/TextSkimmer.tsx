import { useMemo, useState } from 'react'
import { defaultTextOptions, skimText, type TextMode, type TextOptions } from '../lib/text'
import { estimateTextTokens, pctSaved } from '../lib/tokens'

const SAMPLES: Record<TextMode, string> = {
  prose: `# Meeting notes

Basically, I think that we really need to actually ship the new onboarding flow in order to improve activation.

It is important to note that the majority of users drop off at step 3.



Due to the fact that step 3 asks for a credit card, we are able to remove it and just ask later.
Due to the fact that step 3 asks for a credit card, we are able to remove it and just ask later.

In my opinion, at the end of the day, we should just simply test it, you know?`,
  code: `// utils/math.ts
/**
 * Adds two numbers together.
 * @param a - first number
 * @param b - second number
 */
export function add(a: number, b: number): number {
    // return the sum
    return a + b; // simple


}

/* legacy helper — do not use */
export const sub = (a: number, b: number) => a - b`,
  json: `[
  { "id": 1, "name": "Ada Lovelace", "role": "engineer", "active": true },
  { "id": 2, "name": "Alan Turing", "role": "researcher", "active": false },
  { "id": 3, "name": "Grace Hopper", "role": "admiral", "active": true }
]`,
}

const TOGGLES: { key: keyof TextOptions; label: string; modes: TextMode[] }[] = [
  { key: 'collapseWhitespace', label: 'Collapse whitespace', modes: ['prose', 'code'] },
  { key: 'removeFiller', label: 'Cut filler & wordy phrases', modes: ['prose'] },
  { key: 'dedupeLines', label: 'Remove duplicate lines', modes: ['prose'] },
  { key: 'stripMarkdown', label: 'Strip markdown', modes: ['prose'] },
  { key: 'dropStopwords', label: 'Drop stopwords (aggressive)', modes: ['prose'] },
  { key: 'stripComments', label: 'Strip comments', modes: ['code'] },
]

export default function TextSkimmer({ mode }: { mode: TextMode }) {
  const [inputs, setInputs] = useState<Record<TextMode, string>>(SAMPLES)
  const [opts, setOpts] = useState<TextOptions>(defaultTextOptions)
  const [copied, setCopied] = useState(false)

  const input = inputs[mode]
  const output = useMemo(() => skimText(input, mode, opts), [input, mode, opts])
  const tIn = estimateTextTokens(input)
  const tOut = estimateTextTokens(output)
  const saved = pctSaved(tIn, tOut)

  const copy = async () => {
    await navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 1400)
  }

  const toggles = TOGGLES.filter((t) => t.modes.includes(mode))

  return (
    <div className="grid lg:grid-cols-2">
      <Pane
        title={mode === 'json' ? 'input.json' : mode === 'code' ? 'input.ts' : 'input.md'}
        meta={`${tIn.toLocaleString()} tok · ${input.length.toLocaleString()} chars`}
        className="border-b border-line lg:border-r lg:border-b-0"
        action={
          <button
            className="font-mono text-[11px] text-dim hover:text-fg"
            onClick={() => setInputs((s) => ({ ...s, [mode]: '' }))}
          >
            clear
          </button>
        }
      >
        <textarea
          value={input}
          spellCheck={false}
          onChange={(e) => setInputs((s) => ({ ...s, [mode]: e.target.value }))}
          placeholder="Paste anything…"
          className="h-80 w-full resize-none bg-transparent p-5 font-mono text-[13px] leading-[1.6] text-fg outline-none placeholder:text-dim"
        />
        <div className="flex flex-wrap gap-2 border-t border-line p-4">
          {toggles.length ? (
            toggles.map((t) => (
              <button
                key={t.key}
                onClick={() => setOpts((o) => ({ ...o, [t.key]: !o[t.key] }))}
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                  opts[t.key]
                    ? 'border-line-strong bg-hover text-fg'
                    : 'border-line text-dim hover:text-muted'
                }`}
              >
                {opts[t.key] ? '● ' : '○ '}
                {t.label}
              </button>
            ))
          ) : (
            <span className="font-mono text-xs text-dim">
              Minifies JSON · arrays of flat objects become a pipe table (keys written once)
            </span>
          )}
        </div>
      </Pane>

      <Pane
        title="skimmed"
        meta={`${tOut.toLocaleString()} tok · ${output.length.toLocaleString()} chars`}
        action={
          <span
            className={`rounded-full px-2 py-0.5 font-mono text-[11px] ${
              saved > 0 ? 'bg-ok/10 text-ok' : 'bg-white/5 text-dim'
            }`}
          >
            −{saved}%
          </span>
        }
      >
        <pre
          key={output.length}
          className="reveal h-80 overflow-auto p-5 font-mono text-[13px] leading-[1.6] whitespace-pre-wrap text-fg"
        >
          {output || <span className="text-dim">Output appears here</span>}
        </pre>
        <div className="flex items-center justify-between border-t border-line p-4">
          <span className="eyebrow">
            {mode === 'json' ? 'parse → tabulate → minify' : mode === 'code' ? 'strip → collapse' : 'rewrite → dedupe → collapse'}
          </span>
          <button className="btn-solid" onClick={copy} disabled={!output}>
            {copied ? 'Copied ✓' : 'Copy'}
          </button>
        </div>
      </Pane>
    </div>
  )
}

function Pane(props: {
  title: string
  meta: string
  action?: React.ReactNode
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={`flex flex-col ${props.className ?? ''}`}>
      <div className="flex h-11 items-center justify-between border-b border-line px-5">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-fg">{props.title}</span>
          <span className="font-mono text-[11px] text-dim">{props.meta}</span>
        </div>
        {props.action}
      </div>
      {props.children}
    </div>
  )
}
