import clsx from 'clsx'
import { Pause, Play, Ruler } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ConsonantTable } from '../components/ConsonantTable'
import { Controls } from '../components/Controls'
import { Stage } from '../components/Stage'
import { TextField } from '../components/TextField'
import { Panel } from '../components/ui'
import { layout as shapeLayout } from '../lib/hb'
import { useShaping } from '../lib/store'
import { useSpringMorph } from '../lib/useSpringMorph'

const INTRO_MS = 260

function useTypewriter(text) {
  const [visible, setVisible] = useState('')
  const [playing, setPlaying] = useState(false)
  const timer = useRef(null)
  const latest = useRef(text)

  useEffect(() => {
    latest.current = text
  }, [text])

  const stop = useCallback(() => {
    clearInterval(timer.current)
    timer.current = null
    setPlaying(false)
  }, [])

  const play = useCallback(() => {
    clearInterval(timer.current)
    const chars = [...latest.current]
    setVisible('')
    if (chars.length === 0) return

    let i = 0
    setPlaying(true)
    timer.current = setInterval(() => {
      i += 1
      setVisible(chars.slice(0, i).join(''))
      if (i >= chars.length) stop()
    }, INTRO_MS)
  }, [stop])

  useEffect(() => {
    stop()
    setVisible(text)
  }, [text, stop])

  useEffect(() => {
    play()
    return stop
  }, [play, stop])

  return { visible, play, stop, playing }
}

export default function Morph() {
  const { hb, text, setText, options, spring } = useShaping()
  const [showMetrics, setShowMetrics] = useState(true)
  const [highlight, setHighlight] = useState(null)

  const typewriter = useTypewriter(text)

  const layout = useMemo(
    () => shapeLayout(typewriter.visible, options),
    [typewriter.visible, options],
  )
  const { paths, ticks, width } = useSpringMorph(layout, spring)

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <div className="space-y-4">
        <TextField />

        <Panel
          title="Outlines"
          action={
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowMetrics((v) => !v)}
                className={clsx(
                  'flex items-center gap-1.5 text-xs transition-colors',
                  showMetrics ? 'text-ink' : 'text-faint hover:text-ink',
                )}
              >
                <Ruler className="size-3.5" />
                metrics
              </button>
              <button
                type="button"
                onClick={() => (typewriter.playing ? typewriter.stop() : typewriter.play())}
                className="rounded-md bg-ink p-1 text-white transition-opacity hover:opacity-80"
                aria-label={typewriter.playing ? 'Stop typing' : 'Replay typing'}
              >
                {typewriter.playing ? <Pause className="size-3" /> : <Play className="size-3" />}
              </button>
            </div>
          }
        >
          <div className="h-72 sm:h-96">
            {layout.glyphs.length ? (
              <Stage
                paths={paths}
                ticks={ticks}
                width={width}
                upem={hb.upem}
                extents={hb.extents}
                showMetrics={showMetrics}
                highlight={highlight}
                onHover={setHighlight}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-faint">
                Type something to shape it.
              </div>
            )}
          </div>
        </Panel>

        <Panel title="Clusters">
          {layout.glyphs.length ? (
            <div className="flex flex-wrap gap-1.5">
              {layout.glyphs.map((g) => (
                <button
                  key={g.index}
                  type="button"
                  onPointerEnter={() => setHighlight(g.index)}
                  onPointerLeave={() => setHighlight(null)}
                  className={clsx(
                    'rounded-md border px-2 py-1 text-left transition-colors',
                    highlight === g.index ? 'border-ink' : 'border-line',
                  )}
                >
                  <span className="block font-mono text-[11px] text-ink">{g.name}</span>
                  <span className="block font-mono text-[10px] text-faint tabular-nums">
                    cl {g.cluster} · {g.xAdvance}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-faint">No glyphs.</p>
          )}
        </Panel>
        <Panel title="Khmer consonants">
          <ConsonantTable onPick={setText} />
          <p className="mt-3 text-xs text-muted">
            Each pair is the same sound in the two series, first series then second series.
          </p>
        </Panel>
      </div>

      <Controls />
    </div>
  )
}
