import { parseISO, isValid, startOfWeek, format } from 'date-fns'

function safeNum(n) {
  const x = Number(n)
  return Number.isFinite(x) ? x : 0
}

export function applyFilters(rows, filters) {
  return rows.filter((r) => {
    if (filters.ticket_status !== 'All' && r.ticket_status !== filters.ticket_status) return false
    if (filters.priority !== 'All' && r.priority !== filters.priority) return false
    if (filters.assigned_owner !== 'All' && r.assigned_owner !== filters.assigned_owner) return false
    if (filters.follow_up_needed !== 'All' && r.follow_up_needed !== filters.follow_up_needed)
      return false
    return true
  })
}

export function computeKpis(rows, allRows, unmatchedEmailsCount) {
  const totalTickets = allRows.length
  const openTickets = allRows.filter((r) => r.ticket_status === 'Open').length
  const pendingFollowUps = allRows.filter((r) => r.follow_up_needed === 'Yes').length
  const highPriority = allRows.filter((r) => r.priority === 'High').length
  const avgDays =
    allRows.length ? allRows.reduce((sum, r) => sum + safeNum(r.days_since_last_update), 0) / allRows.length : 0

  return {
    totalTickets,
    openTickets,
    pendingFollowUps,
    unmatchedEmails: unmatchedEmailsCount,
    highPriority,
    avgDays,
    visibleTickets: rows.length,
  }
}

export function chartTicketsByStatus(rows) {
  const map = new Map()
  for (const r of rows) map.set(r.ticket_status, (map.get(r.ticket_status) || 0) + 1)
  return [...map.entries()].map(([status, count]) => ({ status, count }))
}

export function chartTicketsByCategory(rows) {
  const map = new Map()
  for (const r of rows) map.set(r.request_category, (map.get(r.request_category) || 0) + 1)
  return [...map.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
}

export function chartFollowUpsByOwner(rows) {
  const map = new Map()
  for (const r of rows) {
    if (r.follow_up_needed !== 'Yes') continue
    map.set(r.assigned_owner, (map.get(r.assigned_owner) || 0) + 1)
  }
  return [...map.entries()]
    .map(([owner, count]) => ({ owner, count }))
    .sort((a, b) => b.count - a.count)
}

export function chartRequestVolumeByWeek(rows) {
  const map = new Map()
  for (const r of rows) {
    const d = parseISO(r.created_date)
    if (!isValid(d)) continue
    const w = startOfWeek(d, { weekStartsOn: 1 })
    const key = format(w, 'yyyy-MM-dd')
    map.set(key, (map.get(key) || 0) + 1)
  }
  return [...map.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([week, count]) => ({ week, count }))
}

export function chartPriorityBreakdown(rows) {
  const map = new Map()
  for (const r of rows) map.set(r.priority, (map.get(r.priority) || 0) + 1)
  return [...map.entries()].map(([priority, count]) => ({ priority, count }))
}

export function topUrgent(rows) {
  const weight = (p) => (p === 'High' ? 3 : p === 'Normal' ? 2 : 1)
  return [...rows]
    .sort((a, b) => weight(b.priority) - weight(a.priority) || b.days_since_last_update - a.days_since_last_update)
    .slice(0, 10)
}

export function processInsights(allRows, unmatchedEmailsCount) {
  const openSorted = allRows
    .filter((r) => r.ticket_status !== 'Resolved')
    .sort((a, b) => b.days_since_last_update - a.days_since_last_update)
  const oldest = openSorted[0]

  const ownerFollowUps = chartFollowUpsByOwner(allRows)
  const topOwner = ownerFollowUps[0]

  const topCategory = chartTicketsByCategory(allRows)[0]

  return {
    insights: [
      oldest
        ? `Oldest unresolved request: ${oldest.ticket_id} (${oldest.days_since_last_update} business days since update).`
        : 'Oldest unresolved request: none in current data.',
      topOwner ? `Owner with most follow ups: ${topOwner.owner} (${topOwner.count}).` : 'Owner follow ups: none.',
      topCategory
        ? `Highest volume category: ${topCategory.category} (${topCategory.count} tickets).`
        : 'Highest volume category: not enough data.',
      `Unmatched inbox emails: ${unmatchedEmailsCount}.`,
    ],
    callouts: [
      {
        title: 'Suggested operating rhythm',
        value: 'Daily triage: respond to High + Pending first, then follow up on Open tickets older than 5 business days.',
      },
      {
        title: 'Inbox hygiene',
        value: 'Use consistent ticket IDs in subjects and ensure related_ticket_id is captured during intake for reliable matching.',
      },
    ],
  }
}

export function fmtNumber(n, digits = 0) {
  return Intl.NumberFormat(undefined, { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(n)
}

