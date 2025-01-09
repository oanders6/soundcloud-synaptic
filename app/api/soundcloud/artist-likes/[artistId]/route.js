import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request, { params }) {
  try {
    const cookieStore = cookies();
    const accessToken = cookieStore.get("access_token")?.value;

    if (!accessToken) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { artistId } = params;

    // Fetch 5 most recent tracks by the artist
    const response = await fetch(
      `https://api.soundcloud.com/users/${artistId}/likes/tracks?limit=5`,
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
    console.error("Error fetching artist tracks:", error);
    return NextResponse.json(
      { error: "Failed to fetch artist tracks" },
      { status: 500 }
    );
  }
}
