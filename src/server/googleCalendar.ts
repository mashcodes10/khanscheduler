import "use-server"
import { clerkClient } from "@clerk/nextjs/server"
import { google } from "googleapis"
import { addMinutes, endOfDay, startOfDay } from "date-fns"

export async function getCalendarEventTimes(
  clerkUserId: string,
  { start, end }: { start: Date; end: Date }
) {
  const oAuthClient = await getOAuthClient(clerkUserId)

  // Get all calendar IDs
  const calendarIds = await getAllCalendarIds(oAuthClient)

  // Query free/busy for all calendars
  const freeBusy = await google.calendar("v3").freebusy.query({
    auth: oAuthClient,
    requestBody: {
      timeMin: start.toISOString(),
      timeMax: end.toISOString(),
      items: calendarIds.map(id => ({ id })),
    },
  })

  // Collect all busy intervals
  const busyIntervals = Object.values(freeBusy.data.calendars || {})
    .flatMap(cal => cal.busy || [])
    .map(({ start, end }) => ({
      start: start ? new Date(start) : null,
      end: end ? new Date(end) : null,
    }))
    .filter(({ start, end }) => start && end)

  return busyIntervals
}

export async function createCalendarEvent({
  clerkUserId,
  guestName,
  guestEmail,
  startTime,
  guestNotes,
  durationInMinutes,
  eventName,
  zoomLink,
}: {
  clerkUserId: string
  guestName: string
  guestEmail: string
  startTime: Date
  guestNotes?: string | null
  durationInMinutes: number
  eventName: string
  zoomLink?: string
}) {
  const oAuthClient = await getOAuthClient(clerkUserId)
  const calendarUser = await clerkClient().users.getUser(clerkUserId)
  if (calendarUser.primaryEmailAddress == null) {
    throw new Error("Clerk user has no email")
  }

  let description = guestNotes ? `Additional Details: ${guestNotes}` : undefined
  if (zoomLink) {
    description = (description ? description + "\n\n" : "") + `Zoom Meeting: ${zoomLink}`
  }

  const calendarEvent = await google.calendar("v3").events.insert({
    calendarId: "primary",
    auth: oAuthClient,
    sendUpdates: "all",
    requestBody: {
      attendees: [
        { email: guestEmail, displayName: guestName },
        {
          email: calendarUser.primaryEmailAddress.emailAddress,
          displayName: calendarUser.fullName,
          responseStatus: "accepted",
        },
      ],
      description,
      start: {
        dateTime: startTime.toISOString(),
      },
      end: {
        dateTime: addMinutes(startTime, durationInMinutes).toISOString(),
      },
      summary: `${guestName} + ${calendarUser.fullName}: ${eventName}`,
    },
  })

  return calendarEvent.data
}

async function getOAuthClient(clerkUserId: string) {
  const token = await clerkClient().users.getUserOauthAccessToken(
    clerkUserId,
    "oauth_google"
  )

  if (token.data.length === 0 || token.data[0].token == null) {
    return
  }

  const client = new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    process.env.GOOGLE_OAUTH_REDIRECT_URL
  )

  client.setCredentials({ access_token: token.data[0].token })

  return client
}

async function getAllCalendarIds(oAuthClient) {
  const calendarList = await google.calendar("v3").calendarList.list({
    auth: oAuthClient,
    maxResults: 250,
  });
  return calendarList.data.items?.map(cal => cal.id) || [];
}