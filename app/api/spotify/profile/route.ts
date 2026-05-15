import { cookies } from "next/headers";

type RawArtist = { name: string; genres: string[] };
type RawTrack  = { name: string; artists: { name: string }[] };

async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  const creds = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
  ).toString("base64");

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${creds}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) return null;
  const data = await res.json() as { access_token: string };
  return data.access_token;
}

export async function GET() {
  console.log("[profile] route called");
  const cookieStore = await cookies();
  let accessToken   = cookieStore.get("spotify_access_token")?.value;
  const refreshToken = cookieStore.get("spotify_refresh_token")?.value;

  console.log("[profile] access_token present:", !!accessToken, "| first 20 chars:", accessToken?.slice(0, 20) ?? "none");
  console.log("[profile] refresh_token present:", !!refreshToken);

  if (!accessToken && !refreshToken) {
    console.log("[profile] no tokens found — returning connected: false");
    return Response.json({ connected: false, topArtists: [], topTracks: [] });
  }

  // ── Step 1: validate token with /me (this alone determines connected state) ──
  let meRes = accessToken
    ? await fetch("https://api.spotify.com/v1/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
    : null;

  // Token expired — attempt refresh once
  if ((!meRes || meRes.status === 401) && refreshToken) {
    const newToken = await refreshAccessToken(refreshToken);
    if (newToken) {
      accessToken = newToken;
      cookieStore.set("spotify_access_token", newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 3600,
        path: "/",
      });
      meRes = await fetch("https://api.spotify.com/v1/me", {
        headers: { Authorization: `Bearer ${newToken}` },
      });
    }
  }

  console.log("[profile] /me response status:", meRes?.status ?? "no response");

  // If /me still fails, token is genuinely invalid — clear and report disconnected
  if (!meRes || !meRes.ok) {
    console.log("[profile] /me failed — clearing cookies, returning connected: false");
    cookieStore.delete("spotify_access_token");
    cookieStore.delete("spotify_refresh_token");
    return Response.json({ connected: false, topArtists: [], topTracks: [] });
  }

  const me = await meRes.json() as { display_name?: string };
  console.log("[profile] /me succeeded — display_name:", me.display_name);

  // ── Step 2: fetch top data — graceful degradation, never blocks connected state ──
  const [artistsResult, tracksResult] = await Promise.allSettled([
    fetch("https://api.spotify.com/v1/me/top/artists?limit=50&time_range=medium_term", {
      headers: { Authorization: `Bearer ${accessToken}` },
    }).then((r) => (r.ok ? r.json() : null)),
    fetch("https://api.spotify.com/v1/me/top/tracks?limit=50&time_range=medium_term", {
      headers: { Authorization: `Bearer ${accessToken}` },
    }).then((r) => (r.ok ? r.json() : null)),
  ]);

  const artistsData = artistsResult.status === "fulfilled" ? artistsResult.value : null;
  const tracksData  = tracksResult.status  === "fulfilled" ? tracksResult.value  : null;

  console.log("[profile] returning connected: true, displayName:", me.display_name ?? null);
  return Response.json({
    connected: true,
    displayName: me.display_name ?? null,
    topArtists: (artistsData?.items as RawArtist[] | undefined)?.map((a) => ({
      name: a.name,
      genres: a.genres,
    })) ?? [],
    topTracks: (tracksData?.items as RawTrack[] | undefined)?.map((t) => ({
      name: t.name,
      artist: t.artists[0]?.name ?? "",
    })) ?? [],
  });
}
