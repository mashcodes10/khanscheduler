import { format, toZonedTime } from 'date-fns-tz'
import { addMinutes, isWithinInterval, parse } from 'date-fns'

export function convertToUTC(date: Date, timezone: string): Date {
  return new Date(date.toLocaleString('en-US', { timeZone: timezone }))
}

export function convertFromUTC(date: Date, timezone: string): Date {
  return toZonedTime(date, timezone)
}

export function formatInTimezone(date: Date, timezone: string, formatStr: string = 'yyyy-MM-dd HH:mm:ss'): string {
  return format(date, formatStr, { timeZone: timezone })
}

export function parseTimeToDate(time: string, date: Date, timezone: string): Date {
  const timeDate = parse(time, 'HH:mm', date)
  return convertToUTC(timeDate, timezone)
}

export function checkTimeConflict(
  startTime1: string,
  endTime1: string,
  startTime2: string,
  endTime2: string,
  date: Date,
  timezone: string
): boolean {
  const start1 = parseTimeToDate(startTime1, date, timezone)
  const end1 = parseTimeToDate(endTime1, date, timezone)
  const start2 = parseTimeToDate(startTime2, date, timezone)
  const end2 = parseTimeToDate(endTime2, date, timezone)

  return (
    isWithinInterval(start1, { start: start2, end: end2 }) ||
    isWithinInterval(end1, { start: start2, end: end2 }) ||
    isWithinInterval(start2, { start: start1, end: end1 })
  )
}

export function getAvailableTimeSlots(
  startTime: string,
  endTime: string,
  duration: number,
  timezone: string,
  date: Date
): { start: Date; end: Date }[] {
  const slots: { start: Date; end: Date }[] = []
  let currentStart = parseTimeToDate(startTime, date, timezone)
  const end = parseTimeToDate(endTime, date, timezone)

  while (currentStart < end) {
    const slotEnd = addMinutes(currentStart, duration)
    if (slotEnd <= end) {
      slots.push({
        start: currentStart,
        end: slotEnd,
      })
    }
    currentStart = slotEnd
  }

  return slots
} 