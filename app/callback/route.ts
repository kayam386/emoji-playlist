export async function GET(request: Request) {
  console.log("[callback] fired — url:", request.url);
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  console.log("[callback] code present:", !!code, "| error:", error);

  if (error || !code) {
    console.log("[callback] aborting — no code or error param");
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
      redirect_uri: process.env.SPOTIFY_REDIRECT_URI!,
    }),
  });

  console.log("[callback] token exchange response status:", tokenRes.status);

  if (!tokenRes.ok) {
    const body = await tokenRes.text();
    console.log("[callback] token exchange FAILED — body:", body);
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

  console.log("[callback] token received — access_token length:", token.access_token?.length, "| has refresh_token:", !!token.refresh_token, "| expires_in:", token.expires_in);

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

  console.log("[callback] Set-Cookie headers being sent:", responseHeaders.getSetCookie?.() ?? "(getSetCookie not available)");
  console.log("[callback] redirecting to /?spotify_connected=1");
  return new Response(null, { status: 302, headers: responseHeaders });
}
