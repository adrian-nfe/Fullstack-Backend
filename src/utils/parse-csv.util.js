import { readFileSync } from 'node:fs'
import { parse } from 'csv-parse/sync'

export function parseCsv(filePath) {
  const content = readFileSync(filePath, 'utf8')
  return parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  })
}
