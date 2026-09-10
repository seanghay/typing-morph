import clsx from 'clsx'
import { CONSONANT_ROWS } from '../lib/consonants'

const COLUMNS = 8

export function ConsonantTable({ onPick }) {
  const cells = CONSONANT_ROWS.flat()
  const trailing = (COLUMNS - (cells.length % COLUMNS)) % COLUMNS

  return (
    <div className="overflow-hidden rounded-md border border-line bg-line">
      <div className="grid grid-cols-8 gap-px">
        {cells.map(([km, roman], i) => (
          <button
            key={`${km}-${roman}`}
            type="button"
            onClick={() => onPick(km)}
            className={clsx(
              'flex flex-col items-center py-2 transition-colors hover:bg-line',
              Math.floor((i % COLUMNS) / 2) % 2 === 0 ? 'bg-white' : 'bg-surface',
            )}
          >
            <span className="text-xl leading-tight">{km}</span>
            <span className="font-mono text-[10px] leading-none text-faint">{roman}</span>
          </button>
        ))}
        {trailing > 0 && <div className="bg-white" style={{ gridColumn: `span ${trailing}` }} />}
      </div>
    </div>
  )
}
