import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'

dayjs.extend(customParseFormat)

export const GERMAN_DATE_FORMAT = 'DD.MM.YYYY'
export const GERMAN_DATE_PLACEHOLDER = 'TT.MM.JJJJ'

export function parseGermanDate(input: string): string | null {
  const match = input.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{2}|\d{4})$/)
  if (!match) return null
  const [, day, month, year] = match
  const normalized = `${day.padStart(2, '0')}.${month.padStart(2, '0')}.${year}`
  const parsed = dayjs(normalized, year.length === 2 ? 'DD.MM.YY' : GERMAN_DATE_FORMAT, true)
  return parsed.isValid() ? parsed.format('YYYY-MM-DD') : null
}
