import { useEffect, useRef, useState } from 'react'
import { glyphCommands } from './hb'
import { buildMorph, buildTicks, ringsToPath } from './morph'
import { MAX_DT, scalar, stepPoints, stepScalar } from './spring'

const EPS_POS = 0.4
const EPS_VEL = 0.4
const EPS_UNIT = 0.002

const EMPTY = { glyphs: [], width: 0 }

function seedRing(ring) {
  return {
    pos: Float64Array.from(ring.a),
    vel: new Float64Array(ring.a.length),
    target: ring.b,
  }
}

function applyPlan(store, layout) {
  const from = { glyphs: store.glyphs, width: store.width.pos }
  const shapes = buildMorph(from.glyphs, layout.glyphs, {
    upem: layout.upem,
    commandsFor: glyphCommands,
  })

  const live = new Set()
  for (const shape of shapes) {
    live.add(shape.cluster)
    let entry = store.clusters.get(shape.cluster)
    if (!entry) {
      entry = { rings: new Map(), opacity: scalar(shape.fromOpacity, shape.toOpacity) }
      store.clusters.set(shape.cluster, entry)
    }
    entry.opacity.target = shape.toOpacity

    const next = new Map()
    for (const ring of shape.rings) {
      const existing = ring.fromKey === null ? undefined : entry.rings.get(ring.fromKey)
      if (existing) {
        existing.target = ring.b
        entry.rings.delete(ring.fromKey)
      }
      next.set(ring.toKey ?? `x${store.seq++}`, existing ?? seedRing(ring))
    }
    for (const [key, ring] of entry.rings) {
      if (key[0] === 'x') next.set(key, ring)
    }
    entry.rings = next
  }

  for (const [cluster, entry] of store.clusters) {
    if (!live.has(cluster)) entry.opacity.target = 0
  }

  const ticks = buildTicks(store.glyphs, layout.glyphs, from.width, layout.width)
  const seen = new Set()
  for (const tick of ticks) {
    seen.add(tick.cluster)
    const existing = store.ticks.get(tick.cluster)
    if (existing) existing.target = tick.to
    else store.ticks.set(tick.cluster, scalar(tick.from, tick.to))
  }
  for (const cluster of store.ticks.keys()) {
    if (!seen.has(cluster)) store.ticks.delete(cluster)
  }

  store.width.target = layout.width
  store.glyphs = layout.glyphs
}

function advance(store, dt, stiffness, damping) {
  let settled = stepScalar(store.width, stiffness, damping, dt, EPS_POS, EPS_VEL)

  for (const [cluster, entry] of store.clusters) {
    for (const [key, ring] of entry.rings) {
      const done = stepPoints(
        ring.pos,
        ring.vel,
        ring.target,
        stiffness,
        damping,
        dt,
        EPS_POS,
        EPS_VEL,
      )
      if (!done) settled = false
      else if (key[0] === 'x') entry.rings.delete(key)
    }
    if (!stepScalar(entry.opacity, stiffness, damping, dt, EPS_UNIT, EPS_UNIT)) settled = false
    if (entry.opacity.target === 0 && entry.opacity.pos <= EPS_UNIT) store.clusters.delete(cluster)
  }

  for (const tick of store.ticks.values()) {
    if (!stepScalar(tick, stiffness, damping, dt, EPS_POS, EPS_VEL)) settled = false
  }

  return settled
}

export function useSpringMorph(layout, { stiffness, damping }) {
  const store = useRef(null)
  const [, render] = useState(0)

  if (store.current === null) {
    store.current = {
      clusters: new Map(),
      ticks: new Map(),
      width: scalar(0, 0),
      glyphs: EMPTY.glyphs,
      applied: null,
      seq: 0,
    }
  }

  useEffect(() => {
    const s = store.current
    if (s.applied !== layout.glyphs) {
      s.applied = layout.glyphs
      applyPlan(s, layout)
    }

    let raf = 0
    let last = performance.now()
    const tick = (now) => {
      const dt = Math.min(MAX_DT, (now - last) / 1000)
      last = now
      const settled = advance(s, dt, stiffness, damping)
      render((n) => n + 1)
      if (!settled) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [layout, stiffness, damping])

  const s = store.current
  const paths = []
  for (const [cluster, entry] of s.clusters) {
    if (entry.opacity.pos <= EPS_UNIT) continue
    const groups = new Map()
    for (const [key, ring] of entry.rings) {
      const split = key.indexOf(':')
      const glyph = split === -1 ? null : Number(key.slice(0, split))
      const id = `${cluster}:${glyph ?? key}`
      const group = groups.get(id)
      if (group) group.rings.push(ring)
      else groups.set(id, { id, glyph, rings: [ring] })
    }
    for (const group of groups.values()) {
      paths.push({
        id: group.id,
        cluster,
        glyph: group.glyph,
        d: ringsToPath(group.rings),
        opacity: entry.opacity.pos,
      })
    }
  }

  return {
    paths,
    ticks: [...s.ticks].map(([cluster, tick]) => ({ cluster, x: tick.pos })),
    width: s.width.pos,
  }
}
