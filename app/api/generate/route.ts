import Anthropic from "@anthropic-ai/sdk";

type TasteProfile = {
  topArtists: { name: string; genres: string[] }[];
  topTracks:  { name: string; artist: string }[];
};

async function getSpotifyToken(): Promise<string> {
  const creds = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
  ).toString("base64");

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${creds}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) throw new Error("Failed to get Spotify token");
  const data = await res.json();
  return data.access_token as string;
}

async function searchSpotify(
  token: string,
  query: string
): Promise<{ name: string; artist: string; albumArt: string; spotifyUrl: string; previewUrl: string | null } | null> {
  const params = new URLSearchParams({ q: query, type: "track", limit: "1" });
  const res = await fetch(`https://api.spotify.com/v1/search?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) return null;
  const data = await res.json();
  const track = data.tracks?.items?.[0];
  if (!track) return null;

  return {
    name: track.name,
    artist: track.artists?.[0]?.name ?? "Unknown Artist",
    albumArt: track.album?.images?.[0]?.url ?? "",
    spotifyUrl: track.external_urls?.spotify ?? "",
    previewUrl: track.preview_url ?? null,
  };
}

function buildPrompt(emojiStr: string, taste: TasteProfile | null): string {
  const tasteBlock = taste
    ? `
This listener's taste profile — use ONLY as secondary context to guide genre/style direction:
- Favourite artists: ${taste.topArtists.slice(0, 15).map((a) => a.name).join(", ")}
- Genre palette: ${[...new Set(taste.topArtists.flatMap((a) => a.genres))].slice(0, 14).join(", ")}
- Songs they already know: ${taste.topTracks.slice(0, 12).map((t) => `"${t.name}" by ${t.artist}`).join(", ")}

Personalization rules:
• The emoji mood/energy is the #1 priority — never compromise it for taste
• Use the genre palette to choose a fitting style lane, nothing more
• Do NOT recommend any artist or song from the lists above
• Goal: songs they would love but haven't discovered yet
`
    : "";

  return `You are a music curator.${tasteBlock}

Based on the vibe expressed by these 5 emojis: ${emojiStr}

Generate a playlist of exactly 18 real songs that perfectly match the collective mood, energy, and aesthetic.

Respond with ONLY a JSON object in this exact format, no other text:
{
  "vibeTitle": "Your [2-3 word mood] is Ready",
  "vibeSubtitle": "A one sentence description of the vibe in 10-15 words",
  "songs": [
    {"title": "Song Title", "artist": "Artist Name"},
    ...18 total songs
  ]
}

Rules:
- Songs must be real, well-known tracks that actually exist on Spotify
- Match the energy level suggested by the emojis
- Vary the artists — no more than 2 songs from the same artist
- vibeTitle should be catchy and describe the mood (e.g. "Your Neon Vibe is Ready", "Your Chill Wave is Ready")`;
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    console.log("[generate] ANTHROPIC_API_KEY present:", !!apiKey, "| length:", apiKey?.length ?? 0);
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set in environment");
    const anthropic = new Anthropic({ apiKey });

    const body = await request.json() as { emojis: string[]; tasteProfile?: TasteProfile | null };
    const { emojis, tasteProfile = null } = body;

    if (!Array.isArray(emojis) || emojis.length !== 5) {
      return Response.json({ error: "Please select exactly 5 emojis" }, { status: 400 });
    }

    const prompt = buildPrompt(emojis.join(" "), tasteProfile);

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== "text") throw new Error("Unexpected response type");

    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in response");

    const parsed = JSON.parse(jsonMatch[0]) as {
      vibeTitle: string;
      vibeSubtitle: string;
      songs: { title: string; artist: string }[];
    };

    const spotifyToken = await getSpotifyToken();

    const trackResults = await Promise.all(
      parsed.songs.map((song) =>
        searchSpotify(spotifyToken, `track:${song.title} artist:${song.artist}`)
          .then((result) => result ?? searchSpotify(spotifyToken, `${song.title} ${song.artist}`))
      )
    );

    return Response.json({
      vibeTitle: parsed.vibeTitle,
      vibeSubtitle: parsed.vibeSubtitle,
      tracks: trackResults.filter(Boolean),
    });
  } catch (e: unknown) {
    console.error(e);
    const message = e instanceof Error ? e.message : "Internal server error";
    return Response.json({ error: message }, { status: 500 });
  }
}
