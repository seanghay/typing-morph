import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { loadFont } from './hb'

const ShapingContext = createContext(null)

const DEFAULT_FEATURES = { liga: null, clig: null, kern: null, ccmp: null, calt: null }

export function ShapingProvider({ children }) {
  const [hb, setHb] = useState(null)
  const [error, setError] = useState(null)
  const [text, setText] = useState('ស៊ីញ៉ាំ')
  const [variations, setVariations] = useState({ opsz: 18, wght: 500, GRAD: 0 })
  const [features, setFeatures] = useState(DEFAULT_FEATURES)
  const [spring, setSpring] = useState({ stiffness: 320, damping: 34 })

  useEffect(() => {
    loadFont().then(setHb).catch(setError)
  }, [])

  const options = useMemo(() => ({ variations, features }), [variations, features])

  const value = useMemo(
    () => ({
      hb,
      error,
      text,
      setText,
      variations,
      setVariations,
      features,
      setFeatures,
      spring,
      setSpring,
      options,
    }),
    [hb, error, text, variations, features, spring, options],
  )

  return <ShapingContext.Provider value={value}>{children}</ShapingContext.Provider>
}

export function useShaping() {
  const ctx = useContext(ShapingContext)
  if (!ctx) throw new Error('useShaping must be used inside ShapingProvider')
  return ctx
}
