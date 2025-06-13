"use server"

import { db } from "@/drizzle/db"
import { ScheduleAvailabilityTable, ScheduleTable } from "@/drizzle/schema"
import { scheduleFormSchema } from "@/schema/schedule"
import { auth } from "@clerk/nextjs/server"
import { eq } from "drizzle-orm"
import { BatchItem } from "drizzle-orm/batch"
import "use-server"
import { z } from "zod"
import { validateAndCreateAvailability } from "../services/scheduling"

export async function saveSchedule(
  unsafeData: z.infer<typeof scheduleFormSchema>
) {
  const { userId } = auth()
  const { success, data } = scheduleFormSchema.safeParse(unsafeData)

  if (!success || userId == null) {
    return { error: true }
  }

  const { availabilities, ...scheduleData } = data

  // Create or update the schedule
  const [{ id: scheduleId }] = await db
    .insert(ScheduleTable)
    .values({ ...scheduleData, clerkUserId: userId })
    .onConflictDoUpdate({
      target: ScheduleTable.clerkUserId,
      set: scheduleData,
    })
    .returning({ id: ScheduleTable.id })

  // Delete existing availabilities
  await db
    .delete(ScheduleAvailabilityTable)
    .where(eq(ScheduleAvailabilityTable.scheduleId, scheduleId))

  // Create new availabilities with conflict detection
  if (availabilities.length > 0) {
    try {
      // Validate and create each availability
      for (const availability of availabilities) {
        await validateAndCreateAvailability(
          scheduleId,
          availability.startTime,
          availability.endTime,
          availability.dayOfWeek
        )
      }
    } catch (error) {
      // If there's a conflict, rollback the schedule update
      await db
        .delete(ScheduleTable)
        .where(eq(ScheduleTable.id, scheduleId))
      return { error: true, message: error instanceof Error ? error.message : "Failed to save schedule" }
    }
  }

  return { success: true }
}
