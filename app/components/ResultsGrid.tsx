"use client";

import { useState } from "react";
import Header from "./Header";
import type { Track } from "../page";

type Props = {
  tracks: Track[];
  emojis: string[];
  vibeTitle: string;
  vibeSubtitle: string;
  onStartOver: () => void;
};

export default function ResultsGrid({ tracks, emojis, vibeTitle, vibeSubtitle, onStartOver }: Props) {
  const [imgErrors, setImgErrors] = useState<Record<number, boolean>>({});

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0d0d1a" }}>
      <Header />

      <div
        className="px-4 pt-6 pb-12 text-center"
        style={{ background: "linear-gradient(180deg, #2d0a4e 0%, #0d0d1a 100%)" }}
      >
        <div className="flex items-center justify-center gap-3 mb-4">
          {emojis.map((emoji, i) => (
            <div
              key={i}
              className="w-12 h-12 rounded-full flex items-center justify-center text-xl"
              style={{ background: "rgba(255,255,255,0.1)", backdropFilter: "blur(8px)" }}
            >
              {emoji}
            </div>
          ))}
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-white mb-2">{vibeTitle}</h1>
        <p className="text-gray-400 text-sm sm:text-base max-w-md mx-auto mb-6">{vibeSubtitle}</p>

        <button
          onClick={onStartOver}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-white text-sm font-medium transition-colors"
          style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)" }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m0 0a8 8 0 0115.356 2m0 0H20M20 20v-5h-.581m0 0a8 8 0 01-15.357-2m0 0H4" />
          </svg>
          Start Over
        </button>
      </div>

      <main className="flex-1 px-4 pb-16 max-w-5xl mx-auto w-full">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          {tracks.map((track, i) => (
            <a
              key={i}
              href={track.spotifyUrl || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-xl overflow-hidden card-hover fade-in-up block"
              style={{
                animationDelay: `${i * 40}ms`,
                background: "#1a1a2e",
              }}
            >
              {/* Square album art — aspect ratio on the image alone, not the whole card */}
              <div className="relative w-full overflow-hidden" style={{ aspectRatio: "1 / 1" }}>
                {!imgErrors[i] && track.albumArt ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={track.albumArt}
                    alt={`${track.name} album art`}
                    className="w-full h-full object-cover"
                    onError={() => setImgErrors((prev) => ({ ...prev, [i]: true }))}
                  />
                ) : (
                  <div
                    className="w-full h-full"
                    style={{
                      background: `linear-gradient(135deg, hsl(${(i * 47) % 360}, 60%, 25%), hsl(${(i * 47 + 120) % 360}, 60%, 15%))`,
                    }}
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-end p-2">
                  <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                    <svg className="w-4 h-4 text-black ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Text area — natural height so it always fits both lines */}
              <div className="p-3 flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  {/* line-clamp-2 lets the title wrap to a second line instead of hard-cutting */}
                  <p className="text-white text-sm font-semibold leading-snug line-clamp-2">{track.name}</p>
                  <p className="text-gray-400 text-xs truncate mt-1">{track.artist}</p>
                </div>
                <svg className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                </svg>
              </div>
            </a>
          ))}
        </div>
      </main>
    </div>
  );
}
