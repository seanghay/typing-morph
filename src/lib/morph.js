import { alignStart, centroidOf, collapse, flattenCommands, resample, translate } from './outline'

export const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)

const RING_POINTS = 256

const cache = new Map()

export function clearOutlineCache() {
  cache.clear()
}

export function outlineOf(gid, commandsFor) {
  let contours = cache.get(gid)
  if (!contours) {
    contours = flattenCommands(commandsFor(gid))
    cache.set(gid, contours)
  }
  return contours
}

function contoursOf(glyphs, commandsFor) {
  const out = []
  for (const g of glyphs) {
    outlineOf(g.gid, commandsFor).forEach((contour, i) => {
      out.push({ contour, dx: g.x, dy: g.y, glyph: g, key: `${g.index}:${i}` })
    })
  }
  return out
}

function centroidHint({ contour, dx, dy }) {
  const [x, y] = centroidOf(resample(contour, 16))
  return [x + dx, y + dy]
}

function matchCost(a, b, upem) {
  const [ax, ay] = centroidHint(a)
  const [bx, by] = centroidHint(b)
  const distance = Math.hypot(ax - bx, ay - by) / upem
  const sizeA = Math.sqrt(Math.abs(a.contour.area))
  const sizeB = Math.sqrt(Math.abs(b.contour.area))
  const size = Math.abs(sizeA - sizeB) / Math.sqrt(upem)
  const winding = Math.sign(a.contour.area) === Math.sign(b.contour.area) ? 0 : 2.5
  return distance + size * 0.6 + winding
}

function pairContours(from, to, upem) {
  const pairs = []
  const usedTo = new Set()
  const usedFrom = new Set()
  const candidates = []

  for (let i = 0; i < from.length; i++) {
    for (let j = 0; j < to.length; j++) {
      candidates.push({ i, j, cost: matchCost(from[i], to[j], upem) })
    }
  }
  candidates.sort((a, b) => a.cost - b.cost)

  for (const { i, j } of candidates) {
    if (usedFrom.has(i) || usedTo.has(j)) continue
    usedFrom.add(i)
    usedTo.add(j)
    pairs.push({ from: from[i], to: to[j] })
  }

  for (let i = 0; i < from.length; i++) {
    if (!usedFrom.has(i)) pairs.push({ from: from[i], to: null })
  }
  for (let j = 0; j < to.length; j++) {
    if (!usedTo.has(j)) pairs.push({ from: null, to: to[j] })
  }

  return pairs
}

function nearestCentroid(entry, others) {
  if (others.length === 0) return centroidHint(entry)
  const [x, y] = centroidHint(entry)
  let best = others[0]
  let bestDistance = Number.POSITIVE_INFINITY
  for (const other of others) {
    const [ox, oy] = centroidHint(other)
    const d = Math.hypot(x - ox, y - oy)
    if (d < bestDistance) {
      bestDistance = d
      best = other
    }
  }
  return centroidHint(best)
}

function resampleAt(entry, count) {
  return translate(resample(entry.contour, count), entry.dx, entry.dy)
}

export function buildMorph(prevGlyphs, nextGlyphs, { upem, commandsFor }) {
  const clusters = new Map()
  const register = (glyphs, key) => {
    for (const g of glyphs) {
      if (!clusters.has(g.cluster)) clusters.set(g.cluster, { from: [], to: [] })
      clusters.get(g.cluster)[key].push(g)
    }
  }
  register(prevGlyphs, 'from')
  register(nextGlyphs, 'to')

  const shapes = []
  for (const [cluster, { from, to }] of [...clusters.entries()].sort((a, b) => a[0] - b[0])) {
    const fromContours = contoursOf(from, commandsFor)
    const toContours = contoursOf(to, commandsFor)
    if (fromContours.length === 0 && toContours.length === 0) continue

    const rings = []
    for (const pair of pairContours(fromContours, toContours, upem)) {
      const count = RING_POINTS
      const fromKey = pair.from?.key ?? null
      const toKey = pair.to?.key ?? null
      if (pair.from && pair.to) {
        const a = resampleAt(pair.from, count)
        rings.push({ a, b: alignStart(a, resampleAt(pair.to, count)), fromKey, toKey })
      } else if (pair.from) {
        const a = resampleAt(pair.from, count)
        rings.push({ a, b: collapse(a, nearestCentroid(pair.from, toContours)), fromKey, toKey })
      } else {
        const b = resampleAt(pair.to, count)
        rings.push({ a: collapse(b, nearestCentroid(pair.to, fromContours)), b, fromKey, toKey })
      }
    }

    shapes.push({
      cluster,
      rings,
      fromOpacity: from.length ? 1 : 0,
      toOpacity: to.length ? 1 : 0,
      glyphs: to.length ? to : from,
    })
  }

  return shapes
}

function pensByCluster(glyphs) {
  const pens = new Map()
  for (const g of glyphs) {
    const pen = g.x - g.xOffset
    if (!pens.has(g.cluster) || pen < pens.get(g.cluster)) pens.set(g.cluster, pen)
  }
  return pens
}

export function buildTicks(prevGlyphs, nextGlyphs, prevWidth, nextWidth) {
  const a = pensByCluster(prevGlyphs)
  const b = pensByCluster(nextGlyphs)
  return [...new Set([...a.keys(), ...b.keys()])]
    .sort((x, y) => x - y)
    .map((cluster) => ({
      cluster,
      from: a.get(cluster) ?? prevWidth,
      to: b.get(cluster) ?? nextWidth,
    }))
}

export function ringsToPath(rings) {
  let d = ''
  for (const { pos } of rings) {
    for (let i = 0; i < pos.length; i += 2) {
      d += `${i === 0 ? 'M' : 'L'}${Math.round(pos[i] * 10) / 10} ${Math.round(pos[i + 1] * 10) / 10}`
    }
    d += 'Z'
  }
  return d
}
