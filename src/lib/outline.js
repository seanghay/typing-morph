const FLATTEN_STEPS = 12

function quadPoint(p0, p1, p2, t) {
  const u = 1 - t
  return [
    u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0],
    u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1],
  ]
}

function cubicPoint(p0, p1, p2, p3, t) {
  const u = 1 - t
  const a = u * u * u
  const b = 3 * u * u * t
  const c = 3 * u * t * t
  const d = t * t * t
  return [
    a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0],
    a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1],
  ]
}

export function flattenCommands(commands) {
  const contours = []
  let current = null
  let cursor = [0, 0]
  let start = [0, 0]

  const push = (p) => {
    const last = current.points[current.points.length - 1]
    if (last && Math.abs(last[0] - p[0]) < 1e-6 && Math.abs(last[1] - p[1]) < 1e-6) return
    current.points.push(p)
  }

  const open = (p) => {
    current = { points: [p], anchors: [0] }
    contours.push(current)
  }

  const anchor = () => current.anchors.push(current.points.length - 1)

  for (const { type, values: v } of commands) {
    if (type === 'M') {
      cursor = [v[0], v[1]]
      start = cursor
      open(cursor)
    } else if (type === 'L') {
      cursor = [v[0], v[1]]
      push(cursor)
      anchor()
    } else if (type === 'Q') {
      const p1 = [v[0], v[1]]
      const p2 = [v[2], v[3]]
      for (let i = 1; i <= FLATTEN_STEPS; i++) push(quadPoint(cursor, p1, p2, i / FLATTEN_STEPS))
      cursor = p2
      anchor()
    } else if (type === 'C') {
      const p1 = [v[0], v[1]]
      const p2 = [v[2], v[3]]
      const p3 = [v[4], v[5]]
      for (let i = 1; i <= FLATTEN_STEPS; i++)
        push(cubicPoint(cursor, p1, p2, p3, i / FLATTEN_STEPS))
      cursor = p3
      anchor()
    } else if (type === 'Z') {
      if (current) {
        const last = current.points[current.points.length - 1]
        if (Math.abs(last[0] - start[0]) > 1e-6 || Math.abs(last[1] - start[1]) > 1e-6) {
          push(start)
          anchor()
        }
        current.points.pop()
        current.anchors = current.anchors.filter((i) => i < current.points.length)
      }
      cursor = start
    }
  }

  return contours.filter((c) => c.points.length > 2).map(measure)
}

function measure(contour) {
  const pts = contour.points
  const n = pts.length
  const cum = new Float64Array(n + 1)
  let area = 0
  for (let i = 0; i < n; i++) {
    const a = pts[i]
    const b = pts[(i + 1) % n]
    cum[i + 1] = cum[i] + Math.hypot(b[0] - a[0], b[1] - a[1])
    area += a[0] * b[1] - b[0] * a[1]
  }
  const anchorAt = [...new Set(contour.anchors)].sort((x, y) => x - y).map((i) => cum[i])
  return { points: pts, cum, length: cum[n], area: area / 2, anchors: anchorAt }
}

function pointAt(contour, distance) {
  const { points, cum, length } = contour
  const n = points.length
  let d = distance % length
  if (d < 0) d += length
  let lo = 0
  let hi = n
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (cum[mid] <= d) lo = mid
    else hi = mid - 1
  }
  const i = Math.min(lo, n - 1)
  const segment = cum[i + 1] - cum[i]
  const t = segment > 1e-9 ? (d - cum[i]) / segment : 0
  const a = points[i]
  const b = points[(i + 1) % n]
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
}

export function resample(contour, count) {
  const out = new Float64Array(count * 2)
  const anchors = contour.anchors.length > 1 ? contour.anchors : [0]
  const spans = []
  for (let i = 0; i < anchors.length; i++) {
    const from = anchors[i]
    const to = i + 1 < anchors.length ? anchors[i + 1] : anchors[0] + contour.length
    spans.push({ from, size: to - from })
  }

  const weight = (s) => Math.sqrt(s.size)
  const total = spans.reduce((sum, s) => sum + weight(s), 0)
  let assigned = 0
  for (const span of spans) {
    span.n = Math.max(1, Math.round((weight(span) / total) * count))
    assigned += span.n
  }
  while (assigned > count) {
    const biggest = spans.reduce((a, b) => (b.n > a.n ? b : a))
    biggest.n -= 1
    assigned -= 1
  }
  while (assigned < count) {
    const biggest = spans.reduce((a, b) => (weight(b) / b.n > weight(a) / a.n ? b : a))
    biggest.n += 1
    assigned += 1
  }

  let k = 0
  for (const span of spans) {
    for (let i = 0; i < span.n; i++) {
      const [x, y] = pointAt(contour, span.from + (span.size * i) / span.n)
      out[k++] = x
      out[k++] = y
    }
  }
  return out
}

export function centroidOf(points) {
  let x = 0
  let y = 0
  const n = points.length / 2
  for (let i = 0; i < n; i++) {
    x += points[i * 2]
    y += points[i * 2 + 1]
  }
  return [x / n, y / n]
}

export function alignStart(a, b) {
  const n = a.length / 2
  let best = 0
  let bestCost = Number.POSITIVE_INFINITY
  const step = n > 96 ? 2 : 1
  for (let offset = 0; offset < n; offset += step) {
    let cost = 0
    for (let i = 0; i < n; i += 4) {
      const j = (i + offset) % n
      const dx = a[i * 2] - b[j * 2]
      const dy = a[i * 2 + 1] - b[j * 2 + 1]
      cost += dx * dx + dy * dy
      if (cost > bestCost) break
    }
    if (cost < bestCost) {
      bestCost = cost
      best = offset
    }
  }
  if (best === 0) return b
  const out = new Float64Array(b.length)
  for (let i = 0; i < n; i++) {
    const j = (i + best) % n
    out[i * 2] = b[j * 2]
    out[i * 2 + 1] = b[j * 2 + 1]
  }
  return out
}

export function collapse(points, [cx, cy]) {
  const out = new Float64Array(points.length)
  for (let i = 0; i < points.length; i += 2) {
    out[i] = cx
    out[i + 1] = cy
  }
  return out
}

export function translate(points, dx, dy) {
  const out = new Float64Array(points.length)
  for (let i = 0; i < points.length; i += 2) {
    out[i] = points[i] + dx
    out[i + 1] = points[i + 1] + dy
  }
  return out
}
