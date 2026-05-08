import React from 'react'
import { Sparkles } from 'lucide-react'

export default function InsightPanel({ title, subtitle, insights, callouts = [] }) {
  return (
    <div className="card">
      <div className="cardHeader">
        <div>
          <h3>
            <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
              <Sparkles size={16} /> {title}
            </span>
          </h3>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
      </div>
      <div className="cardBody">
        <div className="twoCol">
          <div>
            <ul className="insightList">
              {insights.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {callouts.map((c) => (
              <div className="callout" key={c.title}>
                <p className="calloutTitle">{c.title}</p>
                <p className="calloutValue">{c.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

