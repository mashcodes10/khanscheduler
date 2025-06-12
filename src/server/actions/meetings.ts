"use server"
import { db } from "@/drizzle/db"
import { getValidTimesFromSchedule } from "@/lib/getValidTimesFromSchedule"
import { meetingActionSchema } from "@/schema/meetings"
import "use-server"
import { z } from "zod"
import { createCalendarEvent } from "../googleCalendar"
import { redirect } from "next/navigation"
import { fromZonedTime } from "date-fns-tz"
import { createZoomMeeting } from "../zoom"
import { clerkClient } from "@clerk/nextjs/server"
import { ZoomTokenTable } from "@/drizzle/schema"

export async function createMeeting(
  unsafeData: z.infer<typeof meetingActionSchema>
) {
  const { success, data } = meetingActionSchema.safeParse(unsafeData)

  if (!success) return { error: true }

  const event = await db.query.EventTable.findFirst({
    where: ({ clerkUserId, isActive, id }, { eq, and }) =>
      and(
        eq(isActive, true),
        eq(clerkUserId, data.clerkUserId),
        eq(id, data.eventId)
      ),
  })

  if (event == null) return { error: true }
  const startInTimezone = fromZonedTime(data.startTime, data.timezone)

  const validTimes = await getValidTimesFromSchedule([startInTimezone], event)
  if (validTimes.length === 0) return { error: true }

  // Fetch host email from Clerk
  const calendarUser = await clerkClient().users.getUser(data.clerkUserId)
  const hostEmail = calendarUser.primaryEmailAddress?.emailAddress
  if (!hostEmail) return { error: true }

  // Fetch Zoom token from DB
  const zoomToken = await db.query.ZoomTokenTable.findFirst({
    where: (fields, { eq }) => eq(fields.userId, data.clerkUserId),
  })
  if (!zoomToken) throw new Error("User has not connected Zoom")

  const accessToken = zoomToken.accessToken

  // Create Zoom meeting
  let zoomMeeting = null
  try {
    zoomMeeting = await createZoomMeeting({
      topic: event.name,
      start_time: startInTimezone,
      duration: event.durationInMinutes,
      agenda: event.description || undefined,
      host_email: hostEmail,
    })
  } catch (e) {
    // Optionally handle Zoom errors gracefully
    zoomMeeting = null
  }

  await createCalendarEvent({
    ...data,
    startTime: startInTimezone,
    durationInMinutes: event.durationInMinutes,
    eventName: event.name,
    zoomLink: zoomMeeting?.join_url,
  })

  redirect(
    `/book/${data.clerkUserId}/${data.eventId}/success?startTime=${data.startTime.toISOString()}`
  )
}
