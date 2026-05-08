import React, { useEffect, useMemo, useState } from 'react'
import Papa from 'papaparse'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Area,
  AreaChart,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { AlarmClock, ClipboardList, Inbox, MailWarning, ShieldAlert, Timer } from 'lucide-react'

import KpiCard from './components/KpiCard.jsx'
import FilterPanel from './components/FilterPanel.jsx'
import DataTable from './components/DataTable.jsx'
import InsightPanel from './components/InsightPanel.jsx'

import { matchTicketsAndEmails } from './utils/matchRequests.js'
import { applyPriorityRules, computeDaysSinceLastUpdate } from './utils/priorityRules.js'
import {
  applyFilters,
  chartFollowUpsByOwner,
  chartPriorityBreakdown,
  chartRequestVolumeByWeek,
  chartTicketsByCategory,
  chartTicketsByStatus,
  computeKpis,
  fmtNumber,
  processInsights,
  topUrgent,
} from './utils/reportUtils.js'
import { downloadCsv, downloadExcelReport } from './utils/downloadUtils.js'

const COLORS = ['#ffcc66', '#ff8f3d', '#6aa7ff', '#ff6b7a', '#b08cff', '#59d98e']

export default function App() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tracker, setTracker] = useState([])
  const [unmatchedEmails, setUnmatchedEmails] = useState([])
  const [orphanTicketEmails, setOrphanTicketEmails] = useState([])
  const [tab, setTab] = useState('Operations')

  const [filters, setFilters] = useState({
    ticket_status: 'All',
    priority: 'All',
    assigned_owner: 'All',
    follow_up_needed: 'All',
  })

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        setError('')

        const [ticketsRes, inboxRes] = await Promise.all([
          fetch('/data/servicenow_tickets.csv'),
          fetch('/data/outlook_inbox_export.csv'),
        ])
        if (!ticketsRes.ok) throw new Error(`Ticket CSV request failed (${ticketsRes.status})`)
        if (!inboxRes.ok) throw new Error(`Inbox CSV request failed (${inboxRes.status})`)

        const [ticketsText, inboxText] = await Promise.all([ticketsRes.text(), inboxRes.text()])

        const ticketsParsed = Papa.parse(ticketsText, { header: true, skipEmptyLines: true })
        const inboxParsed = Papa.parse(inboxText, { header: true, skipEmptyLines: true })
        if (ticketsParsed.errors?.length) throw new Error(ticketsParsed.errors[0]?.message || 'Ticket CSV parse error')
        if (inboxParsed.errors?.length) throw new Error(inboxParsed.errors[0]?.message || 'Inbox CSV parse error')

        const matched = matchTicketsAndEmails(ticketsParsed.data, inboxParsed.data)

        const enriched = matched.mergedTickets.map((r) => {
          const days = computeDaysSinceLastUpdate(r.last_updated)
          return applyPriorityRules({ ...r, days_since_last_update: days })
        })

        if (!cancelled) {
          setTracker(enriched)
          setUnmatchedEmails(matched.unmatchedEmails)
          setOrphanTicketEmails(matched.orphanTicketEmails)
        }
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Failed to load data.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const visibleTracker = useMemo(() => applyFilters(tracker, filters), [tracker, filters])

  const options = useMemo(() => {
    const uniq = (arr) => ['All', ...[...new Set(arr.filter(Boolean))].sort()]
    return {
      statuses: uniq(tracker.map((r) => r.ticket_status)),
      priorities: uniq(tracker.map((r) => r.priority)),
      owners: uniq(tracker.map((r) => r.assigned_owner)),
      followUps: ['All', 'Yes', 'No'],
    }
  }, [tracker])

  const kpis = useMemo(
    () => computeKpis(visibleTracker, tracker, unmatchedEmails.length),
    [visibleTracker, tracker, unmatchedEmails.length],
  )

  const insights = useMemo(
    () => processInsights(tracker, unmatchedEmails.length),
    [tracker, unmatchedEmails.length],
  )

  const charts = useMemo(() => {
    return {
      byStatus: chartTicketsByStatus(visibleTracker),
      byCategory: chartTicketsByCategory(visibleTracker),
      followUpsByOwner: chartFollowUpsByOwner(visibleTracker),
      volumeByWeek: chartRequestVolumeByWeek(visibleTracker),
      priority: chartPriorityBreakdown(visibleTracker),
    }
  }, [visibleTracker])

  const urgentTop10 = useMemo(() => topUrgent(visibleTracker), [visibleTracker])

  const canDownload = !loading && !error && tracker.length
  const onReset = () =>
    setFilters({ ticket_status: 'All', priority: 'All', assigned_owner: 'All', follow_up_needed: 'All' })

  return (
    <div className="appShell">
      <header className="topBar">
        <div className="topBarInner">
          <div className="brand">
            <div className="brandMark" aria-hidden="true" />
            <div className="brandText">
              <strong>Service Request & Inbox Organization Workflow</strong>
              <span>ServiceNow export + Outlook inbox export → merged tracker + next actions</span>
            </div>
          </div>
          <div className="statusPills">
            <div className="pill">
              CSV sources: <b>/public/data</b>
            </div>
            <div className="pill">
              Tickets: <b>{tracker.length}</b>
            </div>
            <div className="pill">
              Unmatched emails: <b>{unmatchedEmails.length}</b>
            </div>
          </div>
        </div>
      </header>

      <main className="container">
        {loading ? (
          <div className="card">
            <div className="loading">
              <div className="spinner" aria-hidden="true" />
              Loading `servicenow_tickets.csv` + `outlook_inbox_export.csv`…
            </div>
          </div>
        ) : null}

        {error ? <div className="error">Error: {error}</div> : null}

        {!loading && !error ? (
          <>
            <section className="grid kpis" style={{ marginBottom: 14 }}>
              <KpiCard title="Total Tickets" value={kpis.totalTickets} icon={ClipboardList} />
              <KpiCard title="Open Tickets" value={kpis.openTickets} icon={AlarmClock} />
              <KpiCard title="Pending Follow Ups" value={kpis.pendingFollowUps} icon={MailWarning} />
              <KpiCard title="Unmatched Emails" value={kpis.unmatchedEmails} icon={Inbox} />
              <KpiCard title="High Priority Requests" value={kpis.highPriority} icon={ShieldAlert} />
              <KpiCard
                title="Avg Days Since Update"
                value={fmtNumber(kpis.avgDays, 1)}
                icon={Timer}
                subvalue={`${kpis.visibleTickets} visible (filtered)`}
              />
            </section>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
              <div className="tabs" role="tablist" aria-label="Dashboard views">
                <button className={`tab ${tab === 'Operations' ? 'active' : ''}`} type="button" onClick={() => setTab('Operations')} role="tab" aria-selected={tab === 'Operations'}>
                  Operations
                </button>
                <button className={`tab ${tab === 'Inbox Review' ? 'active' : ''}`} type="button" onClick={() => setTab('Inbox Review')} role="tab" aria-selected={tab === 'Inbox Review'}>
                  Inbox Review
                </button>
              </div>
              <div className="pill">
                Matching order: <b>related_ticket_id → subject ID → email</b>
              </div>
            </div>

            <section className="grid main" style={{ marginBottom: 14 }}>
              <FilterPanel
                title="Filters & exports"
                subtitle="Filter the merged tracker and export an operations-ready report."
                filters={[
                  { key: 'ticket_status', label: 'Ticket Status', options: options.statuses },
                  { key: 'priority', label: 'Priority', options: options.priorities },
                  { key: 'assigned_owner', label: 'Assigned Owner', options: options.owners },
                  { key: 'follow_up_needed', label: 'Follow Up Needed', options: options.followUps },
                ]}
                values={filters}
                onChange={(key, value) => setFilters((p) => ({ ...p, [key]: value }))}
                onReset={onReset}
                actions={[
                  {
                    key: 'csv',
                    label: 'Download Merged Tracker CSV',
                    kind: 'csv',
                    primary: true,
                    disabled: !canDownload,
                    onClick: () => downloadCsv('merged_request_tracker', tracker),
                  },
                  {
                    key: 'excel',
                    label: 'Download Excel Report',
                    kind: 'excel',
                    disabled: !canDownload,
                    onClick: () =>
                      downloadExcelReport('inbox_service_request_report', [
                        { name: 'Summary', rows: [summaryRow(kpis)] },
                        { name: 'Merged Tracker', rows: tracker },
                        { name: 'Unmatched Emails', rows: unmatchedEmails },
                        { name: 'Orphan Ticket Emails', rows: orphanTicketEmails },
                      ]),
                  },
                ]}
              />

              <div className="grid" style={{ gap: 14 }}>
                {tab === 'Operations' ? (
                  <>
                    <InsightPanel
                      title="Process improvement recommendations"
                      subtitle="Actionable highlights for administrative triage and follow-through."
                      insights={insights.insights}
                      callouts={insights.callouts}
                    />

                    <DataTable
                      title="Top 10 urgent requests"
                      subtitle="Sorted by priority then days since last update."
                      footnote={`${urgentTop10.length} rows`}
                      columns={urgentColumns}
                      rows={urgentTop10.map((r) => ({ ...r, __key: r.ticket_id }))}
                      density="compact"
                    />
                  </>
                ) : (
                  <DataTable
                    title="Unmatched inbox emails (review queue)"
                    subtitle="Triage these and create a ticket if needed. This view is designed for daily inbox review."
                    footnote={`${unmatchedEmails.length} rows`}
                    columns={emailColumns}
                    rows={unmatchedEmails.map((r) => ({ ...r, __key: r.email_id }))}
                    density="compact"
                  />
                )}
              </div>
            </section>

            {tab === 'Operations' ? (
              <section className="grid charts" style={{ marginBottom: 14 }}>
              <ChartCard title="Tickets by Status" subtitle="Operational status breakdown.">
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend />
                    <Pie data={charts.byStatus} dataKey="count" nameKey="status" innerRadius={55} outerRadius={95}>
                      {charts.byStatus.map((_, idx) => (
                        <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Tickets by Category" subtitle="Top categories by volume.">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={charts.byCategory}>
                    <CartesianGrid stroke="rgba(255,255,255,.08)" vertical={false} />
                    <XAxis dataKey="category" tick={{ fill: 'rgba(231,238,252,.75)', fontSize: 11 }} />
                    <YAxis tick={{ fill: 'rgba(231,238,252,.75)', fontSize: 11 }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="count" name="Tickets" fill="#6aa7ff" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Follow Ups by Assigned Owner" subtitle="Open tickets older than 5 business days.">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={charts.followUpsByOwner} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid stroke="rgba(255,255,255,.08)" horizontal={false} />
                    <XAxis type="number" tick={{ fill: 'rgba(231,238,252,.75)', fontSize: 11 }} />
                    <YAxis type="category" dataKey="owner" tick={{ fill: 'rgba(231,238,252,.75)', fontSize: 11 }} width={130} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="count" name="Follow ups" fill="#ffcc66" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Request Volume by Week" subtitle="Created date grouped weekly.">
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={charts.volumeByWeek}>
                    <CartesianGrid stroke="rgba(255,255,255,.08)" vertical={false} />
                    <XAxis dataKey="week" tick={{ fill: 'rgba(231,238,252,.75)', fontSize: 11 }} />
                    <YAxis tick={{ fill: 'rgba(231,238,252,.75)', fontSize: 11 }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="#ffcc66"
                      fill="rgba(255,204,102,.18)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Priority Breakdown" subtitle="High / Normal / Low mix.">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={charts.priority}>
                    <CartesianGrid stroke="rgba(255,255,255,.08)" vertical={false} />
                    <XAxis dataKey="priority" tick={{ fill: 'rgba(231,238,252,.75)', fontSize: 11 }} />
                    <YAxis tick={{ fill: 'rgba(231,238,252,.75)', fontSize: 11 }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="count" name="Tickets" fill="#7ee2c3" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
              </section>
            ) : null}

            <section className="grid" style={{ gap: 14 }}>
              {tab === 'Operations' ? (
                <div className="split">
                  <DataTable
                    title="Merged request tracker"
                    subtitle="Merged tracker with follow-up rules and recommended actions."
                    footnote={`${visibleTracker.length} visible`}
                    columns={trackerColumns}
                    rows={visibleTracker.map((r) => ({ ...r, __key: r.ticket_id }))}
                    density="compact"
                  />
                  <DataTable
                    title="Unmatched inbox emails"
                    subtitle="Inbox records without a detectable ticket reference."
                    footnote={`${unmatchedEmails.length} rows`}
                    columns={emailColumns}
                    rows={unmatchedEmails.slice(0, 40).map((r) => ({ ...r, __key: r.email_id }))}
                    density="compact"
                  />
                </div>
              ) : (
                <div className="split">
                  <DataTable
                    title="Orphan ticket emails"
                    subtitle="Emails referencing a ticket ID not present in the ServiceNow export."
                    footnote={`${orphanTicketEmails.length} rows`}
                    columns={emailColumns}
                    rows={orphanTicketEmails.slice(0, 40).map((r) => ({ ...r, __key: r.email_id }))}
                    density="compact"
                  />
                  <DataTable
                    title="Urgent tickets (quick view)"
                    subtitle="Use this list to prioritize replies during inbox review."
                    footnote={`${urgentTop10.length} rows`}
                    columns={urgentColumns}
                    rows={urgentTop10.map((r) => ({ ...r, __key: r.ticket_id }))}
                    density="compact"
                  />
                </div>
              )}
            </section>
          </>
        ) : null}
      </main>
    </div>
  )
}

const tooltipStyle = {
  background: 'rgba(9,15,27,.92)',
  border: '1px solid rgba(255,255,255,.12)',
  borderRadius: 12,
}

function ChartCard({ title, subtitle, children }) {
  return (
    <div className="card">
      <div className="cardHeader">
        <div>
          <h3>{title}</h3>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
      </div>
      <div className="cardBody">{children}</div>
    </div>
  )
}

function summaryRow(kpis) {
  return {
    total_tickets: kpis.totalTickets,
    open_tickets: kpis.openTickets,
    pending_follow_ups: kpis.pendingFollowUps,
    unmatched_emails: kpis.unmatchedEmails,
    high_priority_requests: kpis.highPriority,
    average_days_since_update: fmtNumber(kpis.avgDays, 1),
  }
}

const urgentColumns = [
  { key: 'ticket_id', label: 'Ticket', width: 110, render: (v) => <span className="mono">{v}</span> },
  { key: 'priority', label: 'Priority', width: 90 },
  { key: 'ticket_status', label: 'Status', width: 110 },
  { key: 'assigned_owner', label: 'Owner', width: 140 },
  { key: 'days_since_last_update', label: 'Days', width: 70, render: (v) => <span className="mono">{v}</span> },
  { key: 'recommended_action', label: 'Recommended action', width: 200 },
  { key: 'short_description', label: 'Description' },
]

const trackerColumns = [
  { key: 'ticket_id', label: 'Ticket', width: 110, render: (v) => <span className="mono">{v}</span> },
  { key: 'requester_email', label: 'Requester', width: 200, render: (v) => <span className="mono">{v}</span> },
  { key: 'request_category', label: 'Category', width: 150 },
  { key: 'ticket_status', label: 'Status', width: 110 },
  { key: 'priority', label: 'Priority', width: 90 },
  { key: 'assigned_owner', label: 'Owner', width: 140 },
  { key: 'latest_email_date', label: 'Latest email', width: 120, render: (v) => <span className="mono">{v}</span> },
  { key: 'response_status', label: 'Response', width: 110 },
  { key: 'days_since_last_update', label: 'Days', width: 70, render: (v) => <span className="mono">{v}</span> },
  { key: 'follow_up_needed', label: 'Follow up', width: 95 },
  { key: 'recommended_action', label: 'Next action', width: 200 },
]

const emailColumns = [
  { key: 'email_id', label: 'Email', width: 90, render: (v) => <span className="mono">{v}</span> },
  { key: 'sender_email', label: 'Sender', width: 220, render: (v) => <span className="mono">{v}</span> },
  { key: 'received_date', label: 'Received', width: 120, render: (v) => <span className="mono">{v}</span> },
  { key: 'folder', label: 'Folder', width: 140 },
  { key: 'response_status', label: 'Response', width: 110 },
  { key: 'subject', label: 'Subject', width: 260 },
  { key: 'message_summary', label: 'Summary' },
]
