import axios from 'axios';

const ZOOM_API_BASE = 'https://api.zoom.us/v2';

const ZOOM_ACCOUNT_ID = process.env.ZOOM_ACCOUNT_ID!;
const ZOOM_CLIENT_ID = process.env.ZOOM_CLIENT_ID!;
const ZOOM_CLIENT_SECRET = process.env.ZOOM_CLIENT_SECRET!;

async function getZoomAccessToken() {
  const response = await axios.post(
    `https://zoom.us/oauth/token`,
    null,
    {
      params: {
        grant_type: 'account_credentials',
        account_id: ZOOM_ACCOUNT_ID,
      },
      auth: {
        username: ZOOM_CLIENT_ID,
        password: ZOOM_CLIENT_SECRET,
      },
    }
  );
  return response.data.access_token;
}

export async function createZoomMeeting({
  topic,
  start_time,
  duration,
  agenda,
  host_email,
}: {
  topic: string;
  start_time: Date;
  duration: number;
  agenda?: string;
  host_email: string;
}) {
  const accessToken = await getZoomAccessToken();
  const response = await axios.post(
    `${ZOOM_API_BASE}/users/${encodeURIComponent(host_email)}/meetings`,
    {
      topic,
      type: 2, // Scheduled meeting
      start_time: start_time.toISOString(),
      duration,
      agenda,
      timezone: 'UTC',
      settings: {
        join_before_host: true,
        approval_type: 0,
        registration_type: 1,
        enforce_login: false,
        waiting_room: false,
      },
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );
  return response.data; // Contains join_url, start_url, etc.
}

export async function createZoomMeetingWithToken({
  accessToken,
  ...meetingDetails
}) {
  const response = await axios.post(
    `https://api.zoom.us/v2/users/me/meetings`,
    {
      ...meetingDetails,
      type: 2,
      timezone: 'UTC',
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );
  return response.data;
} 