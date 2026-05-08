import { parseISO, isValid, compareDesc } from 'date-fns'

function safeTrim(v) {
  return typeof v === 'string' ? v.trim() : v ?? ''
}

export function normalizeEmail(email) {
  return safeTrim(email).toLowerCase()
}

export function extractTicketIdFromSubject(subject) {
  const s = safeTrim(subject)
  if (!s) return ''
  const m = s.match(/\bINC\d{7}\b/i)
  return m ? m[0].toUpperCase() : ''
}

function latestDate(dates) {
  const parsed = dates
    .map((d) => parseISO(d))
    .filter((d) => isValid(d))
    .sort((a, b) => compareDesc(a, b))
  return parsed.length ? parsed[0] : null
}

export function matchTicketsAndEmails(tickets, emails) {
  const normTickets = tickets.map((t) => ({
    ...t,
    ticket_id: safeTrim(t.ticket_id).toUpperCase(),
    requester_email: normalizeEmail(t.requester_email),
    priority: safeTrim(t.priority) || 'Normal',
  }))

  const normEmails = emails.map((e) => ({
    ...e,
    email_id: safeTrim(e.email_id),
    sender_email: normalizeEmail(e.sender_email),
    related_ticket_id: safeTrim(e.related_ticket_id).toUpperCase(),
    subject: safeTrim(e.subject),
  }))

  const ticketById = new Map(normTickets.map((t) => [t.ticket_id, t]))

  // Index emails by possible keys.
  const emailsByRelated = new Map()
  const emailsBySubjectId = new Map()
  const emailsBySender = new Map()

  for (const e of normEmails) {
    if (e.related_ticket_id) {
      const arr = emailsByRelated.get(e.related_ticket_id) || []
      arr.push(e)
      emailsByRelated.set(e.related_ticket_id, arr)
    }
    const fromSubject = extractTicketIdFromSubject(e.subject)
    if (fromSubject) {
      const arr = emailsBySubjectId.get(fromSubject) || []
      arr.push(e)
      emailsBySubjectId.set(fromSubject, arr)
    }
    if (e.sender_email) {
      const arr = emailsBySender.get(e.sender_email) || []
      arr.push(e)
      emailsBySender.set(e.sender_email, arr)
    }
  }

  const usedEmailIds = new Set()
  const merged = []

  for (const t of normTickets) {
    const candidates = []

    const related = emailsByRelated.get(t.ticket_id) || []
    const bySubject = emailsBySubjectId.get(t.ticket_id) || []
    const bySender = emailsBySender.get(t.requester_email) || []

    for (const e of [...related, ...bySubject, ...bySender]) {
      if (!e?.email_id) continue
      candidates.push(e)
    }

    const unique = new Map()
    for (const e of candidates) unique.set(e.email_id, e)
    const emailList = [...unique.values()]

    // Determine latest email + response status, prefer the most recent email.
    const latest = latestDate(emailList.map((e) => e.received_date))
    const latestEmail = latest
      ? emailList
          .filter((e) => {
            const d = parseISO(e.received_date)
            return isValid(d) && d.getTime() === latest.getTime()
          })
          .slice(-1)[0]
      : null

    if (latestEmail?.email_id) usedEmailIds.add(latestEmail.email_id)

    merged.push({
      ticket_id: t.ticket_id,
      requester_email: t.requester_email,
      request_category: safeTrim(t.request_category) || 'General',
      ticket_status: safeTrim(t.ticket_status) || 'Open',
      latest_email_date: latest ? latest.toISOString().slice(0, 10) : '',
      response_status: safeTrim(latestEmail?.response_status) || 'Unknown',
      assigned_owner: safeTrim(t.assigned_owner) || 'Unassigned',
      priority: safeTrim(t.priority) || 'Normal',
      created_date: safeTrim(t.created_date),
      last_updated: safeTrim(t.last_updated),
      short_description: safeTrim(t.short_description),
      __emails_matched: emailList.length,
    })
  }

  const unmatchedEmails = normEmails
    .filter((e) => !e.related_ticket_id && !extractTicketIdFromSubject(e.subject))
    .filter((e) => !usedEmailIds.has(e.email_id))

  // Also include emails that reference a ticket id that doesn't exist in the export.
  const orphanTicketEmails = normEmails.filter((e) => {
    const tid = e.related_ticket_id || extractTicketIdFromSubject(e.subject)
    return tid && !ticketById.has(tid)
  })

  return {
    mergedTickets: merged,
    unmatchedEmails,
    orphanTicketEmails,
  }
}

