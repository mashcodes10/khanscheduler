"use server"
import { db } from "@/drizzle/db"
import { getValidTimesFromSchedule } from "@/lib/getValidTimesFromSchedule"
import { meetingActionSchema } from "@/schema/meetings"
import "use-server"
import { z } from "zod"
import { createCalendarEvent } from "../googleCalendar"
import { redirect } from "next/navigation"
import { toZonedTime } from "date-fns-tz"
import { createZoomMeeting } from "../zoom"
import { clerkClient } from "@clerk/nextjs/server"
import { ZoomTokenTable } from "@/drizzle/schema"

export async function createMeeting(
  unsafeData: z.infer<typeof meetingActionSchema>
) {
  const { success, data } = meetingActionSchema.safeParse(unsafeData)

  if (!success) {
    console.error("Meeting form validation failed", unsafeData)
    return { error: true }
  }

  const event = await db.query.EventTable.findFirst({
    where: ({ clerkUserId, isActive, id }, { eq, and }) =>
      and(
        eq(isActive, true),
        eq(clerkUserId, data.clerkUserId),
        eq(id, data.eventId)
      ),
  })

  if (event == null) {
    console.error("Event not found", data)
    return { error: true }
  }

  // Convert the start time to UTC for validation
  const startInUTC = toZonedTime(data.startTime, data.timezone)

  const validTimes = await getValidTimesFromSchedule([startInUTC], event)
  if (validTimes.length === 0) {
    console.error("No valid times for event", { startInUTC, event })
    return { error: true }
  }

  // Fetch host email from Clerk
  const calendarUser = await clerkClient().users.getUser(data.clerkUserId)
  const hostEmail = calendarUser.primaryEmailAddress?.emailAddress
  if (!hostEmail) {
    console.error("Host email not found for user", data.clerkUserId)
    return { error: true }
  }

  // Fetch Zoom token from DB
  const zoomToken = await db.query.ZoomTokenTable.findFirst({
    where: (fields, { eq }) => eq(fields.userId, data.clerkUserId),
  })
  if (!zoomToken) {
    console.error("User has not connected Zoom", data.clerkUserId)
    throw new Error("User has not connected Zoom")
  }

  const accessToken = zoomToken.accessToken

  // Create Zoom meeting
  let zoomMeeting = null
  try {
    zoomMeeting = await createZoomMeeting({
      topic: event.name,
      start_time: startInUTC,
      duration: event.durationInMinutes,
      agenda: event.description || undefined,
      host_email: hostEmail,
    })
  } catch (e) {
    console.error("Error creating Zoom meeting", e)
    zoomMeeting = null
  }

  try {
    await createCalendarEvent({
      ...data,
      startTime: startInUTC,
      durationInMinutes: event.durationInMinutes,
      eventName: event.name,
      zoomLink: zoomMeeting?.join_url,
    })
  } catch (e) {
    console.error("Error creating calendar event", e)
    return { error: true }
  }

  redirect(
    `/book/${data.clerkUserId}/${data.eventId}/success?startTime=${data.startTime.toISOString()}`
  )
}
