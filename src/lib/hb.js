import {
  Blob,
  Buffer,
  Face,
  Feature,
  Font,
  shape,
  shapeWithTrace,
  Variation,
  versionString,
} from 'harfbuzzjs'
import { clearOutlineCache } from './morph'

export const FONT_URL = '/fonts/GoogleSans-Variable.ttf'

let state = null

export async function loadFont(url = FONT_URL) {
  if (state) return state
  const data = new Uint8Array(await (await fetch(url)).arrayBuffer())
  const face = new Face(new Blob(data))
  const font = new Font(face)
  font.setScale(face.upem, face.upem)
  state = {
    face,
    font,
    upem: face.upem,
    axes: face.getAxisInfos(),
    extents: font.hExtents(),
    version: versionString(),
    pathCache: new Map(),
    variationKey: '',
  }
  return state
}

export function getFont() {
  if (!state) throw new Error('font not loaded')
  return state
}

export function applyVariations(variations) {
  const hb = getFont()
  const key = Object.entries(variations)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([tag, value]) => `${tag}=${value}`)
    .join(',')
  if (key === hb.variationKey) return
  hb.font.setVariations(Object.entries(variations).map(([tag, value]) => new Variation(tag, value)))
  hb.variationKey = key
  hb.pathCache.clear()
  clearOutlineCache()
}

export function glyphPath(gid) {
  const hb = getFont()
  let path = hb.pathCache.get(gid)
  if (path === undefined) {
    path = hb.font.glyphToPath(gid)
    hb.pathCache.set(gid, path)
  }
  return path
}

export function glyphCommands(gid) {
  return getFont().font.glyphToJson(gid)
}

export function glyphName(gid) {
  return getFont().font.glyphName(gid)
}

function makeBuffer(text, { direction, script, language, clusterLevel }) {
  const buffer = new Buffer()
  buffer.addText(text)
  buffer.guessSegmentProperties()
  if (direction) buffer.setDirection(direction)
  if (script) buffer.setScript(script)
  if (language) buffer.setLanguage(language)
  if (clusterLevel != null) buffer.setClusterLevel(clusterLevel)
  return buffer
}

function toFeatures(features) {
  return Object.entries(features ?? {})
    .filter(([, on]) => on != null)
    .map(([tag, on]) => new Feature(tag, on ? 1 : 0))
}

export function layout(text, options = {}) {
  const hb = getFont()
  if (!text) return { glyphs: [], width: 0, upem: hb.upem }

  applyVariations(options.variations ?? {})
  const buffer = makeBuffer(text, options)
  shape(hb.font, buffer, toFeatures(options.features))

  const infos = buffer.getGlyphInfosAndPositions()
  const glyphs = []
  let penX = 0
  let penY = 0

  for (let i = 0; i < infos.length; i++) {
    const g = infos[i]
    glyphs.push({
      index: i,
      gid: g.codepoint,
      cluster: g.cluster,
      name: hb.font.glyphName(g.codepoint),
      path: glyphPath(g.codepoint),
      x: penX + (g.xOffset ?? 0),
      y: penY + (g.yOffset ?? 0),
      xAdvance: g.xAdvance ?? 0,
      yAdvance: g.yAdvance ?? 0,
      xOffset: g.xOffset ?? 0,
      yOffset: g.yOffset ?? 0,
    })
    penX += g.xAdvance ?? 0
    penY += g.yAdvance ?? 0
  }

  return { glyphs, width: penX, upem: hb.upem }
}

export function trace(text, options = {}) {
  const hb = getFont()
  if (!text) return []
  applyVariations(options.variations ?? {})
  const buffer = makeBuffer(text, options)
  return shapeWithTrace(hb.font, buffer, toFeatures(options.features), 0, 0)
}

function stepGlyphs(items) {
  const hb = getFont()
  const glyphs = []
  let penX = 0
  for (let i = 0; i < items.length; i++) {
    const it = items[i]
    const gid = it.g != null ? it.g : (hb.font.glyph(it.u) ?? 0)
    const xAdvance = it.ax != null ? it.ax : hb.font.glyphHAdvance(gid)
    glyphs.push({
      index: i,
      gid,
      cluster: it.cl,
      name: hb.font.glyphName(gid),
      x: penX + (it.dx ?? 0),
      y: it.dy ?? 0,
      xAdvance,
      xOffset: it.dx ?? 0,
      yOffset: it.dy ?? 0,
    })
    penX += xAdvance
  }
  return { glyphs, width: penX, upem: hb.upem }
}

function label(message) {
  return message.replace(/^(start|end) /, '')
}

export function traceSteps(text, options = {}) {
  const entries = trace(text, options)
  const steps = []
  let last = null
  for (const entry of entries) {
    if (!Array.isArray(entry.t) || entry.t.length === 0) continue
    const signature = JSON.stringify(entry.t)
    if (signature === last) continue
    last = signature
    steps.push({
      id: steps.length,
      label: steps.length === 0 ? 'input' : label(entry.m),
      table: entry.m.includes('GPOS') ? 'GPOS' : entry.m.includes('GSUB') ? 'GSUB' : 'unicode',
      positioned: entry.t[0].ax != null,
      layout: stepGlyphs(entry.t),
    })
  }
  return steps
}

export function codepoints(text) {
  return [...text].map((ch) => ({
    char: ch,
    code: ch.codePointAt(0),
    hex: ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0'),
  }))
}
