import { khnormal } from 'khmer-normalizer'
import { layout } from './hb'

export const RULES = [
  'Sort each syllable by category: base, robat, coeng, shifter, vowel, sign',
  'Collapse repeated invisible characters (ZWNJ, ZWJ, coeng)',
  'Compose េ + ី into ើ, and េ + ា into ោ',
  'Move ុ ahead of ើ',
  'Replace ុ before an upper vowel with a consonant shifter ៉ or ៊',
  'Order coeng ro second in a stack',
  'Rewrite coeng ដ as coeng ត',
]

const hex = (ch) => ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')

function lcs(a, b) {
  const dp = Array.from({ length: a.length + 1 }, () => new Uint16Array(b.length + 1))
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }

  const ops = []
  let i = 0
  let j = 0
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) ops.push({ type: 'same', char: a[i++], b: j++ })
    else if (dp[i + 1][j] >= dp[i][j + 1]) ops.push({ type: 'remove', char: a[i++] })
    else ops.push({ type: 'insert', char: b[j++] })
  }
  while (i < a.length) ops.push({ type: 'remove', char: a[i++] })
  while (j < b.length) ops.push({ type: 'insert', char: b[j++] })
  return ops
}

function markMoves(ops) {
  const inserts = ops.filter((op) => op.type === 'insert')
  for (const op of ops) {
    if (op.type !== 'remove') continue
    const partner = inserts.find((x) => x.type === 'insert' && x.char === op.char)
    if (partner) {
      op.type = 'move'
      op.side = 'input'
      partner.type = 'move'
      partner.side = 'output'
    }
  }
  return ops
}

function cells(ops, side) {
  const edit = side === 'input' ? 'remove' : 'insert'
  const seen = new Map()
  return ops
    .filter(
      (op) => op.type === 'same' || op.type === edit || (op.type === 'move' && op.side === side),
    )
    .map((op) => {
      const nth = (seen.get(op.char) ?? 0) + 1
      seen.set(op.char, nth)
      return {
        key: `${op.char}#${nth}`,
        char: op.char,
        hex: hex(op.char),
        state: op.type === 'same' ? 'same' : op.type === 'move' ? 'moved' : 'changed',
      }
    })
}

function glyphSignature(text, options) {
  return layout(text, options)
    .glyphs.map((g) => `${g.gid}@${Math.round(g.x)},${Math.round(g.y)}`)
    .join(' ')
}

export function analyze(text, options) {
  const normalized = khnormal(text)
  const changed = normalized !== text
  const ops = markMoves(lcs([...text], [...normalized]))

  return {
    normalized,
    changed,
    input: cells(ops, 'input'),
    output: cells(ops, 'output'),
    edits: ops.filter((op) => op.type !== 'same').length,
    sameRendering: changed
      ? glyphSignature(text, options) === glyphSignature(normalized, options)
      : true,
  }
}
