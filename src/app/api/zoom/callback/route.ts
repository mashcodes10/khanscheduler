import { NextResponse } from "next/server";
import axios from "axios";
import { db } from "@/drizzle/db";
import { ZoomTokenTable } from "@/drizzle/schema";
import { auth } from "@clerk/nextjs/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  try {
    const tokenRes = await axios.post(
      "https://zoom.us/oauth/token",
      null,
      {
        params: {
          grant_type: "authorization_code",
          code,
          redirect_uri: process.env.ZOOM_OAUTH_REDIRECT_URL,
        },
        auth: {
          username: process.env.ZOOM_OAUTH_CLIENT_ID!,
          password: process.env.ZOOM_OAUTH_CLIENT_SECRET!,
        },
      }
    );

    const { access_token, refresh_token, expires_in } = tokenRes.data;
    const zoomUserInfo = await axios.get("https://api.zoom.us/v2/users/me", {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const zoomUserId = zoomUserInfo.data.id;

    const { userId } = auth();

    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    await db.insert(ZoomTokenTable).values({
      userId,
      zoomUserId,
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresAt: new Date(Date.now() + expires_in * 1000),
    });

    return NextResponse.redirect("/connect-apps/success");
  } catch (error) {
    console.error("Zoom callback error:", error);
    return NextResponse.json({ error: error?.toString() }, { status: 500 });
  }
}