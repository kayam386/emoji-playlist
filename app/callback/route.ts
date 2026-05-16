export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error || !code) {
    return new Response(null, {
      status: 302,
      headers: { Location: "/?spotify_error=access_denied" },
    });
  }

  const creds = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
  ).toString("base64");

  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${creds}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      // Must exactly match what the login route sent to Spotify.
      // Derive from the request origin if the env var isn't set.
      redirect_uri: process.env.SPOTIFY_REDIRECT_URI ?? `${new URL(request.url).origin}/callback`,
    }),
  });

  if (!tokenRes.ok) {
    return new Response(null, {
      status: 302,
      headers: { Location: "/?spotify_error=token_exchange" },
    });
  }

  const token = await tokenRes.json() as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };

  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  const base   = `HttpOnly; Path=/; SameSite=Lax${secure}`;

  const responseHeaders = new Headers({ Location: "/?spotify_connected=1" });
  responseHeaders.append(
    "Set-Cookie",
    `spotify_access_token=${token.access_token}; ${base}; Max-Age=${token.expires_in}`
  );
  if (token.refresh_token) {
    responseHeaders.append(
      "Set-Cookie",
      `spotify_refresh_token=${token.refresh_token}; ${base}; Max-Age=${60 * 60 * 24 * 60}`
    );
  }

  return new Response(null, { status: 302, headers: responseHeaders });
}
