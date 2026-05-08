import React from 'react'
import { Download, FileSpreadsheet, Filter, RotateCcw } from 'lucide-react'

export default function FilterPanel({
  title,
  subtitle,
  filters,
  values,
  onChange,
  onReset,
  actions,
  search,
  onSearch,
}) {
  return (
    <div className="card">
      <div className="cardHeader">
        <div>
          <h3>
            <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
              <Filter size={16} /> {title}
            </span>
          </h3>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
      </div>
      <div className="cardBody">
        <div className="controls">
          {search ? (
            <div className="controlRow">
              <div className="label">{search.label}</div>
              <input
                type="search"
                value={values?.__search || ''}
                placeholder={search.placeholder || 'Search'}
                onChange={(e) => onSearch?.(e.target.value)}
                aria-label={search.label}
              />
            </div>
          ) : null}

          {filters.map((f) => (
            <div className="controlRow" key={f.key}>
              <div className="label">{f.label}</div>
              <select
                value={values[f.key] ?? 'All'}
                onChange={(e) => onChange(f.key, e.target.value)}
                aria-label={f.label}
              >
                {f.options.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          ))}

          <div className="btnRow">
            <button className="btn" type="button" onClick={onReset}>
              <RotateCcw size={16} /> Reset filters
            </button>
            {actions?.map((a) => (
              <button
                key={a.key}
                className={`btn ${a.primary ? 'primary' : ''}`}
                type="button"
                onClick={a.onClick}
                disabled={a.disabled}
              >
                {a.kind === 'excel' ? <FileSpreadsheet size={16} /> : <Download size={16} />}
                {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

