import clsx from 'clsx'

export function Panel({ title, action, children, className }) {
  return (
    <section className={clsx('rounded-xl border border-line bg-white', className)}>
      {title && (
        <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
            {title}
          </h2>
          {action}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  )
}

export function Slider({ label, value, min, max, step = 1, onChange, disabled }) {
  return (
    <label className={clsx('block', disabled && 'opacity-40')}>
      <span className="mb-2 flex items-baseline justify-between">
        <span className="text-xs font-medium text-ink">{label}</span>
        <span className="font-mono text-xs text-muted tabular-nums">{value}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  )
}

export function Toggle({ label, state, onChange }) {
  const next = { on: 'off', off: 'auto', auto: 'on' }
  const dot = { on: 'bg-ink', off: 'bg-white', auto: 'bg-faint' }
  return (
    <button
      type="button"
      onClick={() => onChange(next[state])}
      className="flex items-center gap-2 rounded-md border border-line px-2.5 py-1.5 text-xs transition-colors hover:border-faint"
    >
      <span className={clsx('size-2 rounded-full border border-line', dot[state])} />
      <span className="font-mono text-ink">{label}</span>
      <span className="text-[10px] uppercase tracking-wider text-faint">{state}</span>
    </button>
  )
}

export function Empty({ children }) {
  return (
    <div className="flex h-full items-center justify-center py-16 text-sm text-faint">
      {children}
    </div>
  )
}
