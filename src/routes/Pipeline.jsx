import clsx from 'clsx'
import { Pause, Play, SkipBack, SkipForward } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Controls } from '../components/Controls'
import { Stage } from '../components/Stage'
import { TextField } from '../components/TextField'
import { Panel } from '../components/ui'
import { traceSteps } from '../lib/hb'
import { useShaping } from '../lib/store'
import { useSpringMorph } from '../lib/useSpringMorph'

const STEP_MS = 700
const EMPTY = { glyphs: [], width: 0, upem: 1000 }

export default function Pipeline() {
  const { hb, text, options, spring } = useShaping()
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)

  const steps = useMemo(() => traceSteps(text, options), [text, options])

  const [session, setSession] = useState(steps)
  if (session !== steps) {
    setSession(steps)
    setIndex(0)
    setPlaying(false)
  }
  const clamped = Math.min(index, Math.max(0, steps.length - 1))
  const step = steps[clamped]

  const { paths, ticks, width } = useSpringMorph(step?.layout ?? EMPTY, spring)

  useEffect(() => {
    if (!playing) return
    const id = setInterval(() => {
      setIndex((i) => {
        if (i >= steps.length - 1) {
          setPlaying(false)
          return i
        }
        return i + 1
      })
    }, STEP_MS)
    return () => clearInterval(id)
  }, [playing, steps.length])

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <div className="space-y-4">
        <TextField />

        <Panel
          title="Shaping pipeline"
          action={
            <span className="font-mono text-[11px] text-muted tabular-nums">
              {steps.length ? clamped + 1 : 0} / {steps.length}
            </span>
          }
        >
          <div className="h-64 sm:h-80">
            {step ? (
              <Stage
                paths={paths}
                ticks={ticks}
                width={width}
                upem={hb.upem}
                extents={hb.extents}
                showMetrics={false}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-faint">
                Type something to trace it.
              </div>
            )}
          </div>

          {steps.length > 0 && (
            <div className="mt-4 space-y-3 border-t border-line pt-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIndex(0)}
                  className="text-muted transition-colors hover:text-ink"
                  aria-label="First step"
                >
                  <SkipBack className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (clamped >= steps.length - 1) setIndex(0)
                    setPlaying((p) => !p)
                  }}
                  className="rounded-md bg-ink p-1.5 text-white transition-opacity hover:opacity-80"
                  aria-label={playing ? 'Pause' : 'Play'}
                >
                  {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => setIndex(steps.length - 1)}
                  className="text-muted transition-colors hover:text-ink"
                  aria-label="Last step"
                >
                  <SkipForward className="size-4" />
                </button>
                <input
                  type="range"
                  min={0}
                  max={steps.length - 1}
                  value={clamped}
                  onChange={(e) => {
                    setPlaying(false)
                    setIndex(Number(e.target.value))
                  }}
                  className="ml-2"
                />
              </div>

              <div className="flex items-baseline gap-2">
                <span
                  className={clsx(
                    'rounded-md px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider',
                    step.table === 'GPOS' ? 'bg-ink text-white' : 'bg-surface text-muted',
                  )}
                >
                  {step.table}
                </span>
                <span className="font-mono text-xs text-ink">{step.label}</span>
              </div>
            </div>
          )}
        </Panel>

        {steps.length > 0 && (
          <Panel title="Steps that changed the buffer">
            <ol className="max-h-64 space-y-0.5 overflow-y-auto">
              {steps.map((s, i) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setPlaying(false)
                      setIndex(i)
                    }}
                    className={clsx(
                      'flex w-full items-baseline gap-3 rounded-md px-2 py-1 text-left font-mono text-[11px] transition-colors',
                      i === clamped ? 'bg-ink text-white' : 'text-muted hover:bg-surface',
                    )}
                  >
                    <span className="w-6 shrink-0 tabular-nums opacity-60">{i + 1}</span>
                    <span className="truncate">{s.label}</span>
                    <span className="ml-auto shrink-0 tabular-nums opacity-60">
                      {s.layout.glyphs.length}g
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </Panel>
        )}
      </div>

      <Controls showSpring={false} />
    </div>
  )
}
