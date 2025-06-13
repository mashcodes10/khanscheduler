"use server"
import { db } from "@/drizzle/db"
import { getValidTimesFromSchedule } from "@/lib/getValidTimesFromSchedule"
import { meetingActionSchema } from "@/schema/meetings"
import "use-server"
import { z } from "zod"
import { createCalendarEvent } from "../googleCalendar"
import { redirect } from "next/navigation"
import { toZonedTime } from "date-fns-tz"
<<<<<<< HEAD
=======
import { addMinutes } from "date-fns"
>>>>>>> 8e67176 (Revert commit db7e57fd39512f6d918fcdbd2e2cefb6a8d71210)
import { createZoomMeeting } from "../zoom"
import { clerkClient } from "@clerk/nextjs/server"
import { EventTable, MeetingTable } from "@/drizzle/schema"

export async function createMeeting(
  unsafeData: z.infer<typeof meetingActionSchema>
) {
  const { success, data } = meetingActionSchema.safeParse(unsafeData)

  if (!success) {
    console.error("Meeting form validation failed", unsafeData)
    return { error: true, message: "Invalid form data" }
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
    return { error: true, message: "Event not found" }
  }

  // Convert the start time to UTC for validation
  const startInUTC = toZonedTime(data.startTime, data.timezone)

<<<<<<< HEAD
  const validTimes = await getValidTimesFromSchedule([startInUTC], event)
  if (validTimes.length === 0) {
    console.error("No valid times for event", { startInUTC, event })
    return { error: true }
=======
  // Initial validation of the time slot
  const validTimes = await getValidTimesFromSchedule([startInUTC], event)
  if (validTimes.length === 0) {
    console.error("No valid times for event", { startInUTC, event })
    return { error: true, message: "This time slot is no longer available" }
>>>>>>> 8e67176 (Revert commit db7e57fd39512f6d918fcdbd2e2cefb6a8d71210)
  }

  // Fetch host email from Clerk
  const calendarUser = await clerkClient().users.getUser(data.clerkUserId)
  const hostEmail = calendarUser.primaryEmailAddress?.emailAddress
  if (!hostEmail) {
    console.error("Host email not found for user", data.clerkUserId)
<<<<<<< HEAD
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
=======
    return { error: true, message: "Host email not found" }
  }

  try {
    // Start a transaction
    return await db.transaction(async (tx) => {
      // Re-validate the time slot within the transaction
      const revalidatedTimes = await getValidTimesFromSchedule([startInUTC], event)
      if (revalidatedTimes.length === 0) {
        throw new Error("Time slot is no longer available")
      }
>>>>>>> 8e67176 (Revert commit db7e57fd39512f6d918fcdbd2e2cefb6a8d71210)

      // Check if a meeting already exists for this time slot
      const existingMeeting = await tx.query.MeetingTable.findFirst({
        where: ({ eventId, startTime }, { eq, and }) =>
          and(
            eq(eventId, data.eventId),
            eq(startTime, startInUTC)
          ),
      })

      if (existingMeeting) {
        throw new Error("This time slot has already been booked")
      }

      // Create Zoom meeting
      const zoomMeeting = await createZoomMeeting({
        topic: `${event.name} with ${data.guestName}`,
        start_time: startInUTC,
        duration: event.durationInMinutes,
        host_email: hostEmail,
      })

      if (!zoomMeeting) {
        throw new Error("Failed to create Zoom meeting")
      }

      // Create calendar event with Zoom link
      const calendarEvent = await createCalendarEvent({
        clerkUserId: data.clerkUserId,
        guestName: data.guestName,
        guestEmail: data.guestEmail,
        startTime: startInUTC,
        guestNotes: data.guestNotes,
        durationInMinutes: event.durationInMinutes,
        eventName: event.name,
        zoomLink: zoomMeeting.join_url,
      })

      if (!calendarEvent) {
        throw new Error("Failed to create calendar event")
      }

      // Store the meeting in the database
      await tx.insert(MeetingTable).values({
        eventId: event.id,
        startTime: startInUTC,
        guestEmail: data.guestEmail,
        guestName: data.guestName,
        guestNotes: data.guestNotes || null,
        timezone: data.timezone,
        zoomMeetingId: String(zoomMeeting.id),
        googleCalendarEventId: calendarEvent.id,
      })

      // Only redirect on success
      redirect(`/book/${data.clerkUserId}/${data.eventId}/success`)
    })
  } catch (error) {
    console.error("Error creating meeting:", error)
    return { 
      error: true, 
      message: error instanceof Error ? error.message : "Failed to create meeting" 
    }
  }
}
