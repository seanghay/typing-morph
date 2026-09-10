import clsx from 'clsx'
import { CONSONANT_ROWS } from '../lib/consonants'

export function ConsonantTable({ selected, onPick }) {
  return (
    <div className="space-y-1">
      {CONSONANT_ROWS.map((row) => (
        <div key={row.map(([km]) => km).join('')} className="grid grid-cols-8 gap-1">
          {row.map(([km, roman]) => (
            <button
              key={`${km}-${roman}`}
              type="button"
              onClick={() => onPick(km)}
              className={clsx(
                'flex flex-col items-center rounded border py-1 transition-colors',
                selected === km ? 'border-ink' : 'border-line hover:border-faint',
              )}
            >
              <span className="text-base leading-tight">{km}</span>
              <span className="font-mono text-[9px] leading-none text-faint">{roman}</span>
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}
