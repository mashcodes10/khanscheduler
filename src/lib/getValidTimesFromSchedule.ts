import { DAYS_OF_WEEK_IN_ORDER } from "@/data/constants"
import { db } from "@/drizzle/db"
import { ScheduleAvailabilityTable } from "@/drizzle/schema"
import { getCalendarEventTimes } from "@/server/googleCalendar"
import {
  addMinutes,
  areIntervalsOverlapping,
  isFriday,
  isMonday,
  isSaturday,
  isSunday,
  isThursday,
  isTuesday,
  isWednesday,
  isWithinInterval,
  setHours,
  setMinutes,
} from "date-fns"
import { formatInTimeZone, toZonedTime } from "date-fns-tz"

export async function getValidTimesFromSchedule(
  timesInOrder: Date[],
  event: { clerkUserId: string; durationInMinutes: number }
) {
  const start = timesInOrder[0]
  const end = timesInOrder.at(-1)

  if (start == null || end == null) return []

  const schedule = await db.query.ScheduleTable.findFirst({
    where: ({ clerkUserId: userIdCol }, { eq }) =>
      eq(userIdCol, event.clerkUserId),
    with: { availabilities: true },
  })

  if (schedule == null) return []

  const groupedAvailabilities = Object.groupBy(
    schedule.availabilities,
    a => a.dayOfWeek
  )

  const eventTimes = await getCalendarEventTimes(event.clerkUserId, {
    start,
    end,
  })

  return timesInOrder.filter(intervalDate => {
    const availabilities = getAvailabilities(
      groupedAvailabilities,
      intervalDate,
      schedule.timezone
    )
    const eventInterval = {
      start: intervalDate,
      end: addMinutes(intervalDate, event.durationInMinutes),
    }

    return (
      eventTimes
        .filter(
          (eventTime): eventTime is { start: Date; end: Date } =>
            eventTime.start instanceof Date && eventTime.end instanceof Date
        )
        .every(eventTime => {
          return !areIntervalsOverlapping(eventTime, eventInterval)
        }) &&
      availabilities.some(availability => {
        return (
          isWithinInterval(eventInterval.start, availability) &&
          isWithinInterval(eventInterval.end, availability)
        )
      })
    )
  })
}

function getAvailabilities(
  groupedAvailabilities: Partial<
    Record<
      (typeof DAYS_OF_WEEK_IN_ORDER)[number],
      (typeof ScheduleAvailabilityTable.$inferSelect)[]
    >
  >,
  date: Date,
  timezone: string
) {
  let availabilities:
    | (typeof ScheduleAvailabilityTable.$inferSelect)[]
    | undefined

  if (isMonday(date)) {
    availabilities = groupedAvailabilities.monday
  }
  if (isTuesday(date)) {
    availabilities = groupedAvailabilities.tuesday
  }
  if (isWednesday(date)) {
    availabilities = groupedAvailabilities.wednesday
  }
  if (isThursday(date)) {
    availabilities = groupedAvailabilities.thursday
  }
  if (isFriday(date)) {
    availabilities = groupedAvailabilities.friday
  }
  if (isSaturday(date)) {
    availabilities = groupedAvailabilities.saturday
  }
  if (isSunday(date)) {
    availabilities = groupedAvailabilities.sunday
  }

  if (availabilities == null) return []

  return availabilities.map(({ startTime, endTime }) => {
    const [startHours, startMinutes] = startTime.split(":").map(Number)
    const [endHours, endMinutes] = endTime.split(":").map(Number)

<<<<<<< HEAD
    // Create a date object in the schedule's timezone
    const localStart = setMinutes(setHours(date, startHours), startMinutes)
    const localEnd = setMinutes(setHours(date, endHours), endMinutes)

    // Convert to UTC for comparison
    const start = new Date(localStart.toLocaleString('en-US', { timeZone: timezone }))
    const end = new Date(localEnd.toLocaleString('en-US', { timeZone: timezone }))
=======
    // Create dates in the schedule's timezone
    const zonedDate = toZonedTime(date, timezone)
    const start = toZonedTime(setMinutes(setHours(zonedDate, startHours), startMinutes), timezone)
    const end = toZonedTime(setMinutes(setHours(zonedDate, endHours), endMinutes), timezone)
>>>>>>> 8e67176 (Revert commit db7e57fd39512f6d918fcdbd2e2cefb6a8d71210)

    return { 
      start: new Date(start), 
      end: new Date(end) 
    }
  })
}
