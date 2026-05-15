"use client";

import { useEffect, useState } from "react";
import Header from "./components/Header";
import EmojiPicker from "./components/CustomEmojiPicker";
import EmojiSlots from "./components/EmojiSlots";
import ResultsGrid from "./components/ResultsGrid";

export type Track = {
  name: string;
  artist: string;
  albumArt: string;
  spotifyUrl: string;
  previewUrl: string | null;
};

type SavedGeneration = {
  id: number;
  emojis: string[];
  vibeTitle: string;
  vibeSubtitle: string;
  tracks: Track[];
};

type SpotifyProfile = {
  connected: boolean;
  displayName?: string | null;
  topArtists: { name: string; genres: string[] }[];
  topTracks: { name: string; artist: string }[];
};

export default function Home() {
  const [selectedEmojis, setSelectedEmojis] = useState<string[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [vibeTitle, setVibeTitle] = useState("");
  const [vibeSubtitle, setVibeSubtitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [view, setView] = useState<"picker" | "results">("picker");
  const [recentGenerations, setRecentGenerations] = useState<SavedGeneration[]>([]);
  const [spotifyProfile, setSpotifyProfile] = useState<SpotifyProfile | null>(null);

  // Fetch Spotify profile on mount (reads httpOnly cookie server-side)
  useEffect(() => {
    console.log("[page] mounting — fetching /api/spotify/profile");
    fetch("/api/spotify/profile")
      .then((r) => r.json())
      .then((data: SpotifyProfile) => {
        console.log("[page] profile fetch result:", JSON.stringify(data));
        setSpotifyProfile(data);
      })
      .catch((err) => {
        console.log("[page] profile fetch error:", err);
      });
  }, []);

  const handleEmojiSelect = (emoji: string) => {
    setSelectedEmojis((prev) => {
      if (prev.includes(emoji)) return prev.filter((e) => e !== emoji);
      if (prev.length >= 5) return prev;
      return [...prev, emoji];
    });
  };

  const handleSlotRemove = (index: number) => {
    setSelectedEmojis((prev) => prev.filter((_, i) => i !== index));
  };

  const handleGenerate = async () => {
    if (selectedEmojis.length !== 5) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emojis: selectedEmojis,
          tasteProfile: spotifyProfile?.connected ? {
            topArtists: spotifyProfile.topArtists,
            topTracks:  spotifyProfile.topTracks,
          } : null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate playlist");
      }
      const data = await res.json();
      setTracks(data.tracks);
      setVibeTitle(data.vibeTitle);
      setVibeSubtitle(data.vibeSubtitle);
      setRecentGenerations((prev) => [
        { id: Date.now(), emojis: selectedEmojis, vibeTitle: data.vibeTitle, vibeSubtitle: data.vibeSubtitle, tracks: data.tracks },
        ...prev,
      ].slice(0, 10));
      setView("results");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleStartOver = () => {
    setView("picker");
    setSelectedEmojis([]);
    setTracks([]);
    setError("");
  };

  const handleReopen = (gen: SavedGeneration) => {
    setTracks(gen.tracks);
    setVibeTitle(gen.vibeTitle);
    setVibeSubtitle(gen.vibeSubtitle);
    setSelectedEmojis(gen.emojis);
    setView("results");
  };

  if (view === "results") {
    return (
      <ResultsGrid
        tracks={tracks}
        emojis={selectedEmojis}
        vibeTitle={vibeTitle}
        vibeSubtitle={vibeSubtitle}
        onStartOver={handleStartOver}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(180deg, #1a0a2e 0%, #0d0d1a 40%)" }}>
      <Header
        spotifyConnected={spotifyProfile?.connected ?? false}
        displayName={spotifyProfile?.displayName}
      />

      <main className="flex-1 flex flex-col items-center px-4 pt-8 pb-16">
        <h1 className="text-4xl sm:text-5xl font-black text-white text-center leading-tight mb-8">
          Pick 5 emojis.<br />Get your playlist.
        </h1>

        <EmojiSlots
          selected={selectedEmojis}
          onRemove={handleSlotRemove}
        />

        <div className="w-full max-w-xl mt-4 mb-6 rounded-xl" style={{ background: "#1a1a2e" }}>
          <EmojiPicker onEmojiSelect={handleEmojiSelect} />
        </div>

        {error && (
          <p className="text-red-400 text-sm mb-4 text-center">{error}</p>
        )}

        <button
          onClick={handleGenerate}
          disabled={selectedEmojis.length !== 5 || loading}
          className="relative px-10 py-4 rounded-full text-white font-bold text-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: selectedEmojis.length === 5 && !loading
              ? "linear-gradient(135deg, #c026d3, #7c3aed)"
              : "linear-gradient(135deg, #6b21a8, #4c1d95)",
            boxShadow: selectedEmojis.length === 5 && !loading
              ? "0 0 32px rgba(192, 38, 211, 0.5)"
              : "none",
          }}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Generating…
            </span>
          ) : (
            "Generate Playlist ✦"
          )}
        </button>

        {recentGenerations.length > 0 && (
          <section className="w-full max-w-2xl mt-16">
            <h2 className="text-white font-semibold text-lg mb-4">Recent Generations</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {recentGenerations.map((gen) => {
                const art = gen.tracks[0]?.albumArt;
                return (
                  <div
                    key={gen.id}
                    onClick={() => handleReopen(gen)}
                    className="flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-colors"
                    style={{ background: "#1a1a2e" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#221a3a")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "#1a1a2e")}
                  >
                    {/* Album art from first track, with gradient fallback */}
                    <div className="w-14 h-14 rounded-lg flex-shrink-0 overflow-hidden" style={{ background: "linear-gradient(135deg,#4c1d95,#831843)" }}>
                      {art && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={art} alt="" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold truncate">{gen.vibeTitle}</p>
                      <p className="text-gray-400 text-sm truncate">{gen.vibeSubtitle}</p>
                      <p className="text-lg mt-1">{gen.emojis.join("")}</p>
                    </div>
                    <svg className="text-gray-600 w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
