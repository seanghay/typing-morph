import clsx from 'clsx'
import { useNavigate } from 'react-router'
import { Panel } from '../components/ui'
import { CONSONANT_ROWS } from '../lib/consonants'
import { useShaping } from '../lib/store'

export default function Consonants() {
  const { text, setText } = useShaping()
  const navigate = useNavigate()

  const pick = (letter) => {
    setText(letter)
    navigate('/morph')
  }

  return (
    <Panel title="Khmer consonants">
      <div className="space-y-1.5">
        {CONSONANT_ROWS.map((row) => (
          <div
            key={row.map(([km]) => km).join('')}
            className="grid grid-cols-4 gap-1.5 sm:grid-cols-8"
          >
            {row.map(([km, roman]) => (
              <button
                key={`${km}-${roman}`}
                type="button"
                onClick={() => pick(km)}
                className={clsx(
                  'flex flex-col items-center gap-0.5 rounded-md border py-2 transition-colors',
                  text === km ? 'border-ink' : 'border-line hover:border-faint',
                )}
              >
                <span className="text-2xl leading-none">{km}</span>
                <span className="font-mono text-[10px] text-muted">{roman}</span>
              </button>
            ))}
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs text-muted">
        Each pair is the same sound in the two series, first series then second series. Click a
        letter to open it in Morph.
      </p>
    </Panel>
  )
}
