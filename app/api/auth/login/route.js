// app/api/auth/login/route.js
import { NextResponse } from "next/server";
import crypto from "crypto";

function generatePKCE() {
  const verifier = crypto.randomBytes(32).toString("base64url");
  const challenge = crypto
    .createHash("sha256")
    .update(verifier)
    .digest("base64url");
  return { verifier, challenge };
}

export async function GET(request) {
  const pkce = generatePKCE();
  const state = crypto.randomBytes(16).toString("hex");

  // Set cookies with PKCE and state
  const response = NextResponse.redirect(
    `https://secure.soundcloud.com/authorize?${new URLSearchParams({
      client_id: process.env.SOUNDCLOUD_CLIENT_ID,
      redirect_uri: process.env.REDIRECT_URI,
      response_type: "code",
      code_challenge: pkce.challenge,
      code_challenge_method: "S256",
      state: state,
    })}`
  );

  response.cookies.set("pkce_verifier", pkce.verifier, { httpOnly: true });
  response.cookies.set("pkce_state", state, { httpOnly: true });

  return response;
}
