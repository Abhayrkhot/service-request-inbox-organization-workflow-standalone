import React from 'react'

export default function DataTable({
  title,
  subtitle,
  columns,
  rows,
  footnote,
  density = 'normal',
}) {
  const pad = density === 'compact' ? '8px 10px' : undefined

  return (
    <div className="card">
      <div className="cardHeader">
        <div>
          <h3>{title}</h3>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {footnote ? <div className="pill">{footnote}</div> : null}
      </div>
      <div className="cardBody">
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c.key} style={c.width ? { width: c.width } : undefined}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.map((r, idx) => (
                  <tr key={r.__key || idx}>
                    {columns.map((c) => (
                      <td key={c.key} style={pad ? { padding: pad } : undefined}>
                        {c.render ? c.render(r[c.key], r) : String(r[c.key] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="muted" colSpan={columns.length}>
                    No rows match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

