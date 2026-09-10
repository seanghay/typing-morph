import clsx from 'clsx'

export function Stage({
  paths,
  ticks,
  width: content,
  upem,
  extents,
  showMetrics,
  highlight,
  onHover,
}) {
  const asc = extents?.ascender ?? upem * 0.8
  const desc = extents?.descender ?? -upem * 0.2
  const pad = upem * 0.35
  const width = Math.max(content, upem * 1.5) + pad * 2
  const height = asc - desc + pad * 2

  return (
    <svg
      viewBox={`${-pad} ${-asc - pad} ${width} ${height}`}
      className="h-full w-full"
      role="img"
      aria-label="Shaped text outlines"
    >
      <g transform="scale(1,-1)">
        {showMetrics && (
          <g vectorEffect="non-scaling-stroke" strokeWidth={upem * 0.005}>
            <line x1={-pad} y1={0} x2={width - pad} y2={0} className="stroke-faint" />
            <line
              x1={-pad}
              y1={asc}
              x2={width - pad}
              y2={asc}
              className="stroke-line"
              strokeDasharray="10 10"
            />
            <line
              x1={-pad}
              y1={desc}
              x2={width - pad}
              y2={desc}
              className="stroke-line"
              strokeDasharray="10 10"
            />
            {ticks.map((tick) => (
              <line
                key={tick.cluster}
                x1={tick.x}
                y1={desc}
                x2={tick.x}
                y2={asc}
                className="stroke-line"
              />
            ))}
          </g>
        )}

        {paths.map((path) => {
          const dim = highlight != null && highlight !== path.glyph
          return (
            <path
              key={path.id}
              d={path.d}
              fillRule="nonzero"
              fillOpacity={path.opacity}
              className={clsx('fill-ink transition-opacity duration-150', dim && 'opacity-15')}
              onPointerEnter={() => onHover?.(path.glyph)}
              onPointerLeave={() => onHover?.(null)}
            />
          )
        })}
      </g>
    </svg>
  )
}
