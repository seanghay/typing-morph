import { X } from 'lucide-react'
import { useShaping } from '../lib/store'

export function TextField({ placeholder = 'Type Khmer or Latin text…' }) {
  const { text, setText } = useShaping()
  return (
    <div className="relative">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        spellCheck={false}
        autoComplete="off"
        className="w-full rounded-xl border border-line bg-white px-4 py-3 pr-10 text-lg outline-none transition-colors placeholder:text-faint focus:border-muted"
      />
      {text && (
        <button
          type="button"
          onClick={() => setText('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-faint transition-colors hover:text-ink"
          aria-label="Clear text"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  )
}
