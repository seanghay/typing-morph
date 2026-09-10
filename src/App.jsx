import clsx from 'clsx'
import { Layers, Table2, Type, Wand2 } from 'lucide-react'
import { Navigate, NavLink, Route, Routes } from 'react-router'
import { ShapingProvider, useShaping } from './lib/store'
import Inspect from './routes/Inspect'
import Morph from './routes/Morph'
import Normalize from './routes/Normalize'
import Pipeline from './routes/Pipeline'

const TABS = [
  { to: '/morph', label: 'Morph', icon: Type },
  { to: '/pipeline', label: 'Pipeline', icon: Layers },
  { to: '/normalize', label: 'Normalize', icon: Wand2 },
  { to: '/inspect', label: 'Inspect', icon: Table2 },
]

function Header() {
  return (
    <header className="sticky top-0 z-10 border-b border-line bg-white/85 backdrop-blur">
      <div className="mx-auto flex h-10 max-w-7xl items-center gap-5 px-6">
        <span className="text-xs font-bold tracking-tight">Typing Morph</span>
        <nav className="flex items-center gap-0.5">
          {TABS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-1 rounded-md px-2 py-1 text-[11px] transition-colors',
                  isActive ? 'bg-ink text-white' : 'text-muted hover:text-ink',
                )
              }
            >
              <Icon className="size-3" />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  )
}

function Shell() {
  const { hb, error } = useShaping()

  if (error) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-6 text-center text-sm text-muted">
        Could not load the font or HarfBuzz wasm. {String(error.message ?? error)}
      </div>
    )
  }

  return (
    <div className="min-h-dvh">
      <Header />
      <main className="mx-auto max-w-7xl px-6 py-5">
        {hb ? (
          <Routes>
            <Route path="/" element={<Navigate to="/morph" replace />} />
            <Route path="/morph" element={<Morph />} />
            <Route path="/pipeline" element={<Pipeline />} />
            <Route path="/normalize" element={<Normalize />} />
            <Route path="/inspect" element={<Inspect />} />
            <Route path="*" element={<Navigate to="/morph" replace />} />
          </Routes>
        ) : (
          <div className="py-32 text-center text-sm text-faint">Loading HarfBuzz…</div>
        )}
      </main>
    </div>
  )
}

export default function App() {
  return (
    <ShapingProvider>
      <Shell />
    </ShapingProvider>
  )
}
