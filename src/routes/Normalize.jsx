import clsx from 'clsx'
import { Check, Pause, Play, RotateCcw } from 'lucide-react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Controls } from '../components/Controls'
import { Stage } from '../components/Stage'
import { TextField } from '../components/TextField'
import { Panel } from '../components/ui'
import { layout as shapeLayout } from '../lib/hb'
import { analyze, RULES } from '../lib/normalize'
import { NORMALIZE_SAMPLES } from '../lib/samples'
import { useShaping } from '../lib/store'
import { useSpringMorph } from '../lib/useSpringMorph'

const TYPE_MS = 460

const STATE_STYLE = {
  same: 'border-line text-muted',
  moved: 'border-ink text-ink',
  changed: 'border-ink bg-ink text-white',
}

function Cells({ cells }) {
  const nodes = useRef(new Map())
  const boxes = useRef(new Map())

  useLayoutEffect(() => {
    const seen = new Set()
    for (const [key, el] of nodes.current) {
      seen.add(key)
      const rect = el.getBoundingClientRect()
      const before = boxes.current.get(key)
      if (before) {
        const dx = before.x - rect.x
        const dy = before.y - rect.y
        if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
          el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], {
            duration: 420,
            easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
          })
        }
      }
      boxes.current.set(key, { x: rect.x, y: rect.y })
    }
    for (const key of boxes.current.keys()) {
      if (!seen.has(key)) boxes.current.delete(key)
    }
  })

  if (cells.length === 0) return <p className="text-sm text-faint">Empty.</p>

  return (
    <div className="flex flex-wrap gap-1">
      {cells.map((cell) => (
        <span
          key={cell.key}
          ref={(el) => {
            if (el) nodes.current.set(cell.key, el)
            else nodes.current.delete(cell.key)
          }}
          className={clsx(
            'flex min-w-11 flex-col items-center rounded-md border px-1.5 py-1',
            STATE_STYLE[cell.state],
          )}
        >
          <span className="text-base leading-tight">{cell.char}</span>
          <span className="font-mono text-[9px] tabular-nums opacity-70">{cell.hex}</span>
        </span>
      ))}
    </div>
  )
}

function Frame({ label, text }) {
  const { hb, options, spring } = useShaping()
  const layout = useMemo(() => shapeLayout(text, options), [text, options])
  const { paths, ticks, width } = useSpringMorph(layout, spring)

  return (
    <div className="min-w-0 flex-1">
      <p className="mb-1 text-[10px] uppercase tracking-[0.14em] text-faint">{label}</p>
      <div className="h-40 rounded-md border border-line">
        <Stage
          paths={paths}
          ticks={ticks}
          width={width}
          upem={hb.upem}
          extents={hb.extents}
          showMetrics={false}
        />
      </div>
    </div>
  )
}

function Playback({ result }) {
  const chars = useMemo(
    () => [...result.normalized].map((char, i) => ({ char, id: `${i}-${char}` })),
    [result.normalized],
  )
  const [step, setStep] = useState(chars.length)
  const [playing, setPlaying] = useState(false)

  const [session, setSession] = useState(chars)
  if (session !== chars) {
    setSession(chars)
    setStep(chars.length)
    setPlaying(false)
  }

  useEffect(() => {
    if (!playing) return
    const id = setInterval(() => {
      setStep((s) => {
        if (s >= chars.length) {
          setPlaying(false)
          return s
        }
        return s + 1
      })
    }, TYPE_MS)
    return () => clearInterval(id)
  }, [playing, chars.length])

  const shown = chars
    .slice(0, step)
    .map((c) => c.char)
    .join('')
  const replay = () => {
    setStep(0)
    setPlaying(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => (step >= chars.length ? replay() : setPlaying((p) => !p))}
          className="rounded-md bg-ink p-1.5 text-white transition-opacity hover:opacity-80"
          aria-label={playing ? 'Pause' : 'Play'}
        >
          {playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
        </button>
        <button
          type="button"
          onClick={replay}
          className="text-muted transition-colors hover:text-ink"
          aria-label="Replay from start"
        >
          <RotateCcw className="size-3.5" />
        </button>
        <input
          type="range"
          min={0}
          max={chars.length}
          value={step}
          onChange={(e) => {
            setPlaying(false)
            setStep(Number(e.target.value))
          }}
          className="ml-1"
        />
        <span className="shrink-0 font-mono text-[11px] text-muted tabular-nums">
          {step}/{chars.length}
        </span>
      </div>

      <div className="flex flex-wrap gap-1">
        {chars.map((cell, i) => (
          <button
            key={cell.id}
            type="button"
            onClick={() => {
              setPlaying(false)
              setStep(i + 1)
            }}
            className={clsx(
              'min-w-8 rounded-md border px-1.5 py-1 text-base leading-tight transition-colors',
              i < step ? 'border-ink text-ink' : 'border-line text-faint',
            )}
          >
            {cell.char}
          </button>
        ))}
      </div>

      <Frame label="normalized" text={shown} />

      {step > 0 && (
        <div className="space-y-2 border-t border-line pt-3">
          <div className="flex items-baseline gap-2">
            <span className="text-[10px] uppercase tracking-[0.14em] text-faint">code points</span>
            <span className="font-mono text-[11px] text-faint tabular-nums">
              {result.changed ? `${result.edits} edits` : 'already normal'}
            </span>
          </div>
          <Cells cells={result.output.slice(0, step)} />
        </div>
      )}

      <p className="text-xs text-muted">
        {step === 0
          ? 'Press play to type the normalized string one code point at a time.'
          : result.changed
            ? 'This is the correct typing order — it differs from what you entered.'
            : 'What you typed is already in normal order.'}
      </p>
    </div>
  )
}

export default function Normalize() {
  const { text, options } = useShaping()
  const result = useMemo(() => analyze(text, options), [text, options])

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <div className="space-y-4">
        <TextField placeholder="Type or paste Khmer text to normalize…" />

        {text && (
          <Panel
            title="Typing"
            action={
              result.changed && (
                <span
                  className={clsx(
                    'flex items-center gap-1 text-[11px]',
                    result.sameRendering ? 'text-muted' : 'text-ink',
                  )}
                >
                  {result.sameRendering && <Check className="size-3.5" />}
                  {result.sameRendering ? 'identical shaping' : 'shaping differs'}
                </span>
              )
            }
          >
            <Playback result={result} />
          </Panel>
        )}

        <Panel title="What khnormal does">
          <ol className="space-y-1.5">
            {RULES.map((rule, i) => (
              <li key={rule} className="flex gap-3 text-xs text-muted">
                <span className="font-mono text-faint tabular-nums">{i + 1}</span>
                <span>{rule}</span>
              </li>
            ))}
          </ol>
        </Panel>
      </div>

      <Controls showSpring={false} samples={NORMALIZE_SAMPLES} />
    </div>
  )
}
