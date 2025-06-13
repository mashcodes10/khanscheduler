import { db } from "@/drizzle/db"
import { ScheduleAvailabilityTable, ScheduleTable, scheduleDayOfWeekEnum } from "@/drizzle/schema"
import { checkTimeConflict } from "@/lib/timezone"
import { and, eq } from "drizzle-orm"

type DayOfWeek = typeof scheduleDayOfWeekEnum.enumValues[number]

export async function checkAvailabilityConflicts(
  startTime: string,
  endTime: string,
  dayOfWeek: DayOfWeek,
  scheduleId: string,
  excludeAvailabilityId?: string
) {
  const schedule = await db.query.ScheduleTable.findFirst({
    where: eq(ScheduleTable.id, scheduleId),
  })

  if (!schedule) {
    throw new Error("Schedule not found")
  }

  const existingAvailabilities = await db.query.ScheduleAvailabilityTable.findMany({
    where: and(
      eq(ScheduleAvailabilityTable.scheduleId, scheduleId),
      eq(ScheduleAvailabilityTable.dayOfWeek, dayOfWeek),
      excludeAvailabilityId
        ? eq(ScheduleAvailabilityTable.id, excludeAvailabilityId)
        : undefined
    ),
  })

  const date = new Date() // Use this as a reference date for time conversion
  const hasConflict = existingAvailabilities.some(availability =>
    checkTimeConflict(
      startTime,
      endTime,
      availability.startTime,
      availability.endTime,
      date,
      schedule.timezone
    )
  )

  return hasConflict
}

export async function getScheduleTimezone(scheduleId: string) {
  const schedule = await db.query.ScheduleTable.findFirst({
    where: eq(ScheduleTable.id, scheduleId),
  })

  if (!schedule) {
    throw new Error("Schedule not found")
  }

  return schedule.timezone
}

export async function validateAndCreateAvailability(
  scheduleId: string,
  startTime: string,
  endTime: string,
  dayOfWeek: DayOfWeek
) {
  const hasConflict = await checkAvailabilityConflicts(
    startTime,
    endTime,
    dayOfWeek,
    scheduleId
  )

  if (hasConflict) {
    throw new Error("Time slot conflicts with existing availability")
  }

  const [availability] = await db
    .insert(ScheduleAvailabilityTable)
    .values({
      scheduleId,
      startTime,
      endTime,
      dayOfWeek,
    })
    .returning()

  return availability
}

export async function validateAndUpdateAvailability(
  availabilityId: string,
  scheduleId: string,
  startTime: string,
  endTime: string,
  dayOfWeek: DayOfWeek
) {
  const hasConflict = await checkAvailabilityConflicts(
    startTime,
    endTime,
    dayOfWeek,
    scheduleId,
    availabilityId
  )

  if (hasConflict) {
    throw new Error("Time slot conflicts with existing availability")
  }

  const [availability] = await db
    .update(ScheduleAvailabilityTable)
    .set({
      startTime,
      endTime,
      dayOfWeek,
    })
    .where(
      and(
        eq(ScheduleAvailabilityTable.id, availabilityId),
        eq(ScheduleAvailabilityTable.scheduleId, scheduleId)
      )
    )
    .returning()

  return availability
} 