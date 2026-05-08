import React from 'react'

export default function KpiCard({ title, value, subvalue, icon: Icon }) {
  return (
    <div className="card">
      <div className="kpi">
        <div className="kpiIcon" aria-hidden="true">
          {Icon ? <Icon size={18} /> : null}
        </div>
        <div className="kpiMeta">
          <span>{title}</span>
          <strong title={String(value)}>{value}</strong>
          {subvalue ? <div className="kpiSub">{subvalue}</div> : null}
        </div>
      </div>
    </div>
  )
}

