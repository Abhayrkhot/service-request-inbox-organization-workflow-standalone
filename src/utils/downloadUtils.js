import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { format } from 'date-fns'

function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function downloadCsv(filenameBase, rows) {
  const csv = Papa.unparse(rows, { quotes: false })
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const stamp = format(new Date(), 'yyyyMMdd_HHmm')
  downloadBlob(`${filenameBase}_${stamp}.csv`, blob)
}

export function downloadExcelReport(filenameBase, sheets) {
  const wb = XLSX.utils.book_new()
  for (const s of sheets) {
    const ws = XLSX.utils.json_to_sheet(s.rows)
    XLSX.utils.book_append_sheet(wb, ws, s.name)
  }
  const stamp = format(new Date(), 'yyyyMMdd_HHmm')
  XLSX.writeFile(wb, `${filenameBase}_${stamp}.xlsx`)
}

