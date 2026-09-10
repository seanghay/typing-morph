import { RotateCcw } from 'lucide-react'
import { SAMPLES } from '../lib/samples'
import { useShaping } from '../lib/store'
import { Panel, Slider, Toggle } from './ui'

const FEATURES = ['liga', 'clig', 'calt', 'ccmp', 'kern']

const asState = (v) => (v == null ? 'auto' : v ? 'on' : 'off')
const fromState = (s) => (s === 'auto' ? null : s === 'on')

export function Controls({ showSpring = true, samples = SAMPLES }) {
  const { hb, variations, setVariations, features, setFeatures, spring, setSpring, setText } =
    useShaping()

  return (
    <div className="space-y-4">
      <Panel title="Samples">
        <div className="flex flex-wrap gap-1.5">
          {samples.map((s) => (
            <button
              key={s.label}
              type="button"
              title={s.note}
              onClick={() => setText(s.text)}
              className="rounded-md border border-line px-2.5 py-1.5 text-xs text-ink transition-colors hover:border-faint"
            >
              {s.label}
            </button>
          ))}
        </div>
      </Panel>

      <Panel
        title="Variable axes"
        action={
          <button
            type="button"
            onClick={() => setVariations({ opsz: 18, wght: 500, GRAD: 0 })}
            className="text-muted transition-colors hover:text-ink"
            aria-label="Reset axes"
          >
            <RotateCcw className="size-3.5" />
          </button>
        }
      >
        <div className="space-y-4">
          {Object.values(hb?.axes ?? {}).map((axis) => (
            <Slider
              key={axis.tag}
              label={axis.tag}
              min={axis.min}
              max={axis.max}
              step={axis.tag === 'opsz' ? 0.1 : 1}
              value={variations[axis.tag] ?? axis.default}
              onChange={(v) => setVariations((prev) => ({ ...prev, [axis.tag]: v }))}
            />
          ))}
        </div>
      </Panel>

      <Panel title="OpenType features">
        <div className="flex flex-wrap gap-1.5">
          {FEATURES.map((tag) => (
            <Toggle
              key={tag}
              label={tag}
              state={asState(features[tag])}
              onChange={(s) => setFeatures((prev) => ({ ...prev, [tag]: fromState(s) }))}
            />
          ))}
        </div>
      </Panel>

      {showSpring && (
        <Panel title="Spring">
          <div className="space-y-4">
            <Slider
              label="stiffness"
              min={20}
              max={400}
              step={5}
              value={spring.stiffness}
              onChange={(v) => setSpring((prev) => ({ ...prev, stiffness: v }))}
            />
            <Slider
              label="damping"
              min={4}
              max={60}
              step={1}
              value={spring.damping}
              onChange={(v) => setSpring((prev) => ({ ...prev, damping: v }))}
            />
          </div>
        </Panel>
      )}
    </div>
  )
}
