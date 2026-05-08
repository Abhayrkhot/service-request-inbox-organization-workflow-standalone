import { parseISO, isValid, differenceInBusinessDays } from 'date-fns'

function safeTrim(v) {
  return typeof v === 'string' ? v.trim() : v ?? ''
}

export function computeDaysSinceLastUpdate(lastUpdated) {
  const d = parseISO(safeTrim(lastUpdated))
  if (!isValid(d)) return 0
  return Math.max(0, differenceInBusinessDays(new Date(), d))
}

export function applyPriorityRules(row) {
  const ticketStatus = safeTrim(row.ticket_status) || 'Open'
  const priority = safeTrim(row.priority) || 'Normal'
  const responseStatus = safeTrim(row.response_status) || 'Unknown'
  const days = row.days_since_last_update ?? computeDaysSinceLastUpdate(row.last_updated)

  let followUpNeeded = 'No'
  let recommendedAction = 'No immediate action'

  if (ticketStatus === 'Open' && days > 5) followUpNeeded = 'Yes'

  if (priority === 'High' && responseStatus === 'Pending') recommendedAction = 'Respond today'
  else if (ticketStatus === 'Resolved') recommendedAction = 'Archive'
  else if (!row.ticket_id) recommendedAction = 'Review and create ticket if needed'
  else if (ticketStatus === 'In Progress') recommendedAction = 'Monitor progress'

  return {
    ...row,
    days_since_last_update: days,
    follow_up_needed: followUpNeeded,
    recommended_action: recommendedAction,
  }
}

