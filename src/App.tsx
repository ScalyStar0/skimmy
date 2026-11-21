import { useState } from 'react'
import ImageSkimmer from './components/ImageSkimmer'
import TextSkimmer from './components/TextSkimmer'

type Tab = 'image' | 'prose' | 'code' | 'json'

const TABS: { id: Tab; label: string; sub: string }[] = [
  { id: 'image', label: 'image', sub: 'downscale & re-encode' },
  { id: 'prose', label: 'text', sub: 'cut filler & repeats' },
  { id: 'code', label: 'code', sub: 'strip comments' },
  { id: 'json', label: 'json', sub: 'tabulate & minify' },
]

const HERO_LINES: Record<Tab, string> = {
  image: 'Send a 768px image, not a 4K one. ~80% fewer tokens.',
  prose: 'Rambling notes in, signal out.',
  code: 'Strip comments & blank lines before pasting.',
  json: 'Repeated keys → one compact table.',
}

export default function App() {
  const [tab, setTab] = useState<Tab>('image')

  const go = (t: Tab) => {
    setTab(t)
    document.getElementById('tool')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen">
      {/* NAV */}
      <header className="sticky top-0 z-30 border-b border-line/60 bg-black/70 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6 lg:px-12">
          <div className="flex items-center gap-6">
            <a href="#" className="flex items-center gap-3">
              <span className="text-fg">◭</span>
              <span className="text-dim">/</span>
              <span className="font-serif text-2xl leading-none">skimmy</span>
            </a>
            <nav className="hidden gap-5 text-sm text-muted sm:flex">
              <a href="#tool" className="hover:text-fg">Tool</a>
              <a href="#how" className="hover:text-fg">How it works</a>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-2 font-mono text-[11px] text-dim md:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-ok" /> runs 100% in your browser
            </span>
            <button className="btn" onClick={() => go('image')}>Open tool</button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative isolate overflow-hidden border-b border-line/60">
        <div className="mx-auto flex max-w-6xl flex-col justify-center px-6 py-24 md:py-32 lg:px-12">
          <div className="max-w-lg">
            <h1 className="font-serif text-[88px] leading-[0.9] tracking-tight">skimmy</h1>
            <p className="mt-5 text-[30px] leading-[1.2] tracking-[-0.03em]">
              Fewer tokens.
              <br />
              Same picture.
            </p>
            <div className="mt-6 flex items-center gap-2 text-sm">
              {TABS.map((t, i) => (
                <span key={t.id} className="flex items-center gap-2">
                  {i > 0 && <span className="text-dim">·</span>}
                  <button
                    onMouseEnter={() => setTab(t.id)}
                    onClick={() => go(t.id)}
                    className={`capitalize transition-colors ${
                      tab === t.id ? 'text-fg' : 'text-[#737373] hover:text-[#a1a1a1]'
                    }`}
                  >
                    {t.label}
                  </button>
                </span>
              ))}
            </div>
            <div className="hairline mt-4 w-80" />
            <button
              onClick={() => go(tab)}
              key={tab}
              className="reveal mt-3 block max-w-xs text-left text-sm text-[#a1a1a1] transition-colors hover:text-fg"
            >
              {HERO_LINES[tab]} <span className="text-fg">→</span>
            </button>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-6 lg:px-12">
        {/* TOOL */}
        <section id="tool" className="scroll-mt-24 pt-20 pb-36">
          <div className="mx-auto mb-12 max-w-xl text-center">
            <h2 className="text-3xl leading-[1.05] tracking-[-0.045em] sm:text-5xl sm:leading-tight">
              Drop anything. Keep the signal.
            </h2>
            <p className="mt-4 leading-relaxed text-muted">
              Shrink images, prose, code and data before they hit a context window. Nothing is
              uploaded — every pass runs locally with{' '}
              <code className="rounded bg-hover px-1.5 py-0.5 font-mono text-[13px] text-fg">canvas</code>{' '}
              and plain string transforms.
            </p>
          </div>

          <div className="card overflow-hidden">
            <div className="grid grid-cols-2 border-b border-line sm:grid-cols-4">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`relative px-5 py-3.5 text-left transition-colors ${
                    tab === t.id ? 'bg-raised' : 'hover:bg-white/[0.02]'
                  }`}
                >
                  <div className={`font-mono text-sm ${tab === t.id ? 'text-fg' : 'text-muted'}`}>
                    {t.label}
                  </div>
                  <div className="text-xs text-dim">{t.sub}</div>
                  {tab === t.id && <span className="absolute inset-x-0 bottom-0 h-px bg-fg" />}
                </button>
              ))}
            </div>
            {tab === 'image' ? <ImageSkimmer /> : <TextSkimmer mode={tab} />}
          </div>
        </section>

        {/* HOW */}
        <section id="how" className="scroll-mt-24 pb-36">
          <div className="mb-8 flex items-end justify-between">
            <h2 className="text-2xl tracking-[-0.04em] md:text-3xl">How tokens are counted</h2>
            <span className="eyebrow hidden sm:block">estimates · not billing</span>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                t: 'Claude',
                f: 'tokens ≈ (w × h) / 750',
                d: 'Cost scales with pixel area. Halving both sides cuts tokens ~4×. Images over 1568px are downscaled anyway.',
              },
              {
                t: 'GPT',
                f: '85 + 170 × tiles(512²)',
                d: 'Fit into 2048², short side to 768, then billed per 512px tile. Fewer tiles = fewer tokens.',
              },
              {
                t: 'Gemini',
                f: '258 × tiles(768²)',
                d: 'Anything ≤ 384px on both sides is a single 258-token tile — the cheapest possible image.',
              },
            ].map((c) => (
              <div key={c.t} className="card p-5 transition-colors hover:border-line-strong">
                <h3 className="font-medium">{c.t}</h3>
                <code className="mt-3 block rounded-md border border-line bg-black px-3 py-2 font-mono text-[13px] text-ident">
                  {c.f}
                </code>
                <p className="mt-3 text-sm leading-relaxed text-muted">{c.d}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="card p-5">
              <h3 className="font-medium">Text</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Roughly 4 characters per token. Whitespace, repeated lines, comments and repeated
                JSON keys are all billed — and almost never needed by the model.
              </p>
            </div>
            <div className="card p-5">
              <h3 className="font-medium">Rule of thumb</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Screenshots of UI or text read fine at <span className="text-fg">768px</span>.
                Photos for “what is this?” questions work at <span className="text-fg">384px</span>.
                Only keep <span className="text-fg">1152px+</span> for dense diagrams.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-sm text-dim sm:flex-row lg:px-12">
          <span className="font-serif text-xl text-fg">skimmy</span>
          <span className="font-mono text-xs">no uploads · no tracking · just fewer tokens</span>
        </div>
      </footer>
    </div>
  )
}
