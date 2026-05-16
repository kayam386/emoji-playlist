import { redirect } from "next/navigation";

export async function GET(request: Request) {
  // Use the env var if set; otherwise derive from the incoming request origin.
  // This makes the route work on any host (local, Vercel preview, production)
  // without needing to hardcode URLs.
  const origin = new URL(request.url).origin;
  const redirectUri =
    process.env.SPOTIFY_REDIRECT_URI ?? `${origin}/callback`;

  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.SPOTIFY_CLIENT_ID!,
    scope: "user-top-read",
    redirect_uri: redirectUri,
  });

  redirect(`https://accounts.spotify.com/authorize?${params}`);
}
