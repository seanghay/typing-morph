import { useMemo } from 'react'
import { Controls } from '../components/Controls'
import { TextField } from '../components/TextField'
import { Panel } from '../components/ui'
import { codepoints, layout as shapeLayout } from '../lib/hb'
import { useShaping } from '../lib/store'

function Table({ head, rows }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left font-mono text-xs">
        <thead>
          <tr className="border-b border-line">
            {head.map((h) => (
              <th key={h} className="py-2 pr-4 font-medium uppercase tracking-wider text-faint">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-b border-line/60 last:border-0">
              {row.cells.map((cell, i) => (
                <td key={head[i]} className="py-2 pr-4 tabular-nums text-ink">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function Inspect() {
  const { hb, text, options } = useShaping()
  const layout = useMemo(() => shapeLayout(text, options), [text, options])
  const chars = useMemo(() => codepoints(text), [text])

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <div className="space-y-4">
        <TextField />

        <Panel title={`Input · ${chars.length} code points`}>
          <Table
            head={['#', 'char', 'code point']}
            rows={chars.map((c, i) => ({
              key: `${i}-${c.hex}`,
              cells: [i, c.char, `U+${c.hex}`],
            }))}
          />
        </Panel>

        <Panel title={`Output · ${layout.glyphs.length} glyphs`}>
          {layout.glyphs.length ? (
            <Table
              head={['#', 'glyph', 'gid', 'cluster', 'advance', 'offset']}
              rows={layout.glyphs.map((g) => ({
                key: g.index,
                cells: [
                  g.index,
                  g.name,
                  g.gid,
                  g.cluster,
                  g.xAdvance,
                  `${g.xOffset}, ${g.yOffset}`,
                ],
              }))}
            />
          ) : (
            <p className="text-sm text-faint">No glyphs.</p>
          )}
        </Panel>

        <Panel title="Face">
          <Table
            head={['property', 'value']}
            rows={[
              { key: 'upem', cells: ['upem', hb.upem] },
              { key: 'asc', cells: ['ascender', hb.extents.ascender] },
              { key: 'desc', cells: ['descender', hb.extents.descender] },
              { key: 'width', cells: ['advance width', layout.width] },
              { key: 'hb', cells: ['harfbuzz', hb.version] },
            ]}
          />
        </Panel>
      </div>

      <Controls showSpring={false} />
    </div>
  )
}
