import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = cookies();
    const accessToken = cookieStore.get("access_token")?.value;

    if (!accessToken) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const response = await fetch(
      `https://api.soundcloud.com/me/likes/tracks?limit=20&`,
      {
        headers: {
          Authorization: `OAuth ${accessToken}`,
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`SoundCloud API error: ${response.status}`);
    }

    const tracks = await response.json();
    return NextResponse.json(tracks);
  } catch (error) {
    console.error("Error fetching likes:", error);
    return NextResponse.json(
      { error: "Failed to fetch liked tracks" },
      { status: 500 }
    );
  }
}
