# Service Request and Inbox Organization Workflow

## Purpose
Standalone dashboard that simulates how an administrative team can connect a **ServiceNow ticket export** with an **Outlook inbox export** to identify open requests, pending replies, unmatched emails, urgent work, and recommended next actions—without requiring any system credentials.

## Tools used
- React + Vite (JavaScript)
- PapaParse (CSV parsing)
- Recharts (charts)
- SheetJS `xlsx` (Excel export)
- date-fns (business-day calculations + weekly grouping)
- lucide-react (icons)
- Plain CSS (responsive dashboard UI)

## How to run
```bash
npm install
npm run dev
```

## How to build
```bash
npm run build
```

## Live demo
- [https://service-request-inbox-organization-workflow-standalo-a0kflfdjh.vercel.app/](https://service-request-inbox-organization-workflow-standalo-a0kflfdjh.vercel.app/)
- [https://service-request-inbox-organization.vercel.app/](https://service-request-inbox-organization.vercel.app/)

## How to deploy
This project loads CSVs from `public/data` using `fetch("/data/...")` so it works on Vercel, Netlify, and GitHub Pages.

### Vercel
- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`

### Netlify
- Build command: `npm run build`
- Publish directory: `dist`

## Features
- Loads:
  - `public/data/servicenow_tickets.csv`
  - `public/data/outlook_inbox_export.csv`
- Normalizes requester/sender emails
- Matches inbox emails to tickets using:
  1. `related_ticket_id`
  2. ticket ID found inside `subject`
  3. requester/sender email as a fallback
- Builds a merged tracker with:
  - status, owner, priority, latest email date, response status
  - **business days since last update**
  - follow-up needed + recommended action rules
- KPI cards and charts for operational monitoring
- Tables:
  - Top 10 urgent requests
  - Unmatched inbox emails
- Exports:
  - Download merged tracker CSV
  - Download Excel report (Summary + Tracker + Unmatched emails)
- Written process improvement recommendations

## Administrative skills demonstrated
- Ticket intake tracking and ownership assignment logic
- Inbox organization and response-status monitoring
- Follow-up rules and prioritization workflow design
- Reporting exports suitable for spreadsheet-based operations

