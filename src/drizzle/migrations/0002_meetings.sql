CREATE TABLE IF NOT EXISTS "meetings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "eventId" uuid NOT NULL,
  "startTime" timestamp NOT NULL,
  "guestEmail" text NOT NULL,
  "guestName" text NOT NULL,
  "guestNotes" text,
  "timezone" text NOT NULL,
  "zoomMeetingId" text NOT NULL,
  "googleCalendarEventId" text NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "meetings_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE
); 