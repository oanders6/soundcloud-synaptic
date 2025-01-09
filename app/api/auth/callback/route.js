// app/api/auth/callback/route.js
import { NextResponse } from "next/server";

export async function GET(request) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  console.log("Received callback with code:", code);
  console.log("State:", state);

  const savedState = request.cookies.get("pkce_state")?.value;
  if (!state || state !== savedState) {
    console.error("State mismatch:", { received: state, saved: savedState });
    return NextResponse.redirect("/error?message=invalid_state");
  }

  try {
    const tokenRequestBody = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: process.env.SOUNDCLOUD_CLIENT_ID,
      client_secret: process.env.SOUNDCLOUD_CLIENT_SECRET,
      redirect_uri: process.env.REDIRECT_URI,
      code: code,
      code_verifier: request.cookies.get("pkce_verifier")?.value,
    });

    console.log("Token request body:", tokenRequestBody.toString());
    console.log("Code verifier:", request.cookies.get("pkce_verifier")?.value);

    // Changed from /oauth2/token to /oauth/token
    const tokenResponse = await fetch(
      "https://secure.soundcloud.com/oauth/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json; charset=utf-8",
        },
        body: tokenRequestBody,
      }
    );

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Token exchange failed with status:", tokenResponse.status);
      console.error("Error response:", errorText);
      return NextResponse.json(
        { error: `Token exchange failed: ${errorText}` },
        { status: 500 }
      );
    }

    const tokens = await tokenResponse.json();
    console.log("Successfully received tokens");

    const response = NextResponse.redirect(new URL("/dashboard", request.url));

    response.cookies.set("access_token", tokens.access_token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 3600, // this sets a duration for the access token -- can change if want a session for more than a hour
    });

    if (tokens.refresh_token) {
      response.cookies.set("refresh_token", tokens.refresh_token, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
      });
    }

    return response;
  } catch (error) {
    console.error("Auth error:", error);
    return NextResponse.json(
      { error: error.message || "Authentication failed" },
      { status: 500 }
    );
  }
}
