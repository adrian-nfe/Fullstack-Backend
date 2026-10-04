export function asEndOfDay(time) {
  return time === '00:00' ? '24:00' : time
}

export function toMinutes(time) {
  const [hours, minutes] = asEndOfDay(time).split(':').map(Number)
  return hours * 60 + minutes
}

export function isValidSchedule(openingHour, closingHour) {
  const openingAsEndOfDay = asEndOfDay(openingHour)
  const closingAsEndOfDay = asEndOfDay(closingHour)
  return closingAsEndOfDay > openingAsEndOfDay
}

export const VENUE_TIME_ZONE = 'Europe/Madrid'

const madridFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: VENUE_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

function madridParts(date) {
  const parts = madridFormatter.formatToParts(date)
  const read = (type) => Number(parts.find((part) => part.type === type)?.value)
  return {
    year: read('year'),
    month: read('month'),
    day: read('day'),
    hour: read('hour'),
    minute: read('minute'),
  }
}

export function venueToday(date = new Date()) {
  const { year, month, day } = madridParts(date)
  const pad = (value) => String(value).padStart(2, '0')
  return year + '-' + pad(month) + '-' + pad(day)
}

export function venueNowMinutes(date = new Date()) {
  const { hour, minute } = madridParts(date)
  return hour * 60 + minute
}
