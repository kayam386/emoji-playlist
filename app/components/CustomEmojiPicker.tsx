"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type EmojiEntry = {
  emoji: string;
  group: number;
  annotation: string;
  tags?: string[];
  order: number;
};

const CATEGORIES = [
  { group: 0, label: "Smileys & Emotion", icon: "😀" },
  { group: 1, label: "People & Body",      icon: "👋" },
  { group: 3, label: "Animals & Nature",   icon: "🐶" },
  { group: 4, label: "Food & Drink",       icon: "🍎" },
  { group: 5, label: "Travel & Places",    icon: "✈️" },
  { group: 6, label: "Activities",         icon: "⚽" },
  { group: 7, label: "Objects",            icon: "💡" },
  { group: 8, label: "Symbols",            icon: "💯" },
  { group: 9, label: "Flags",              icon: "🏳️" },
];

// Module-level cache — survives component remounts within the same page session.
// Initialised once; subsequent mounts read instantly with no fetch.
let _emojiCache: EmojiEntry[] | null = null;
let _emojiPromise: Promise<EmojiEntry[]> | null = null;

function loadEmojis(): Promise<EmojiEntry[]> {
  if (_emojiCache) return Promise.resolve(_emojiCache);
  if (!_emojiPromise) {
    _emojiPromise = fetch("/emoji-data.json")
      .then((r) => r.json())
      .then((data: EmojiEntry[]) => {
        _emojiCache = data
          .filter((e) => e.group !== 2 && e.emoji)
          .sort((a, b) => a.order - b.order);
        return _emojiCache;
      });
  }
  return _emojiPromise;
}

type Props = { onEmojiSelect: (emoji: string) => void };

const PICKER_H = 360;
const SEARCH_H = 44;
const NAV_H    = 50;
const GRID_H   = PICKER_H - SEARCH_H - NAV_H;

export default function CustomEmojiPicker({ onEmojiSelect }: Props) {
  // Ref holds the data — survives re-renders without triggering extra renders itself.
  // Initialise from cache immediately if available (handles remounts after data was loaded).
  const dataRef = useRef<EmojiEntry[]>(_emojiCache ?? []);

  // Single boolean state used only to trigger a re-render once data is ready.
  const [loaded, setLoaded] = useState<boolean>(_emojiCache !== null);

  const [query, setQuery]         = useState("");
  const [activeGroup, setActiveGroup] = useState(0);

  const scrollRef    = useRef<HTMLDivElement>(null);
  const sectionRefs  = useRef<Record<number, HTMLDivElement | null>>({});

  // useEffect guarantees this only runs on the client — never during SSR.
  // The module-level cache means remounts resolve instantly without a second fetch.
  useEffect(() => {
    if (_emojiCache) return; // already loaded from a previous mount
    loadEmojis().then((data) => {
      dataRef.current = data;
      setLoaded(true);
    });
  }, []);

  const grouped = useMemo(() => {
    const map: Record<number, EmojiEntry[]> = {};
    for (const cat of CATEGORIES) map[cat.group] = [];
    for (const e of dataRef.current) {
      if (map[e.group] !== undefined) map[e.group].push(e);
    }
    return map;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  const searchResults = useMemo(() => {
    if (!query.trim()) return null;
    const q = query.toLowerCase();
    return dataRef.current.filter(
      (e) =>
        e.annotation.toLowerCase().includes(q) ||
        e.tags?.some((t) => t.toLowerCase().includes(q))
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, loaded]);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current || query) return;
    const top = scrollRef.current.scrollTop;
    let current = CATEGORIES[0].group;
    for (const cat of CATEGORIES) {
      const el = sectionRefs.current[cat.group];
      if (el && el.offsetTop - 4 <= top) current = cat.group;
    }
    setActiveGroup(current);
  }, [query]);

  const jumpTo = (group: number) => {
    const el = sectionRefs.current[group];
    if (el && scrollRef.current) {
      scrollRef.current.scrollTop = el.offsetTop;
      setActiveGroup(group);
    }
  };

  return (
    <div style={{ height: PICKER_H, background: "#1a1a2e", borderRadius: "0.75rem", display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* ── Search bar ── */}
      <div style={{ height: SEARCH_H, padding: "8px 10px", flexShrink: 0, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.07)", borderRadius: 8, padding: "0 10px", height: "100%" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search emoji"
            style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "#fff", fontSize: 14, caretColor: "#a855f7" }}
          />
          {query && (
            <button onClick={() => setQuery("")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "#6b7280", lineHeight: 1 }}>✕</button>
          )}
        </div>
      </div>

      {/* ── Emoji grid ── */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={{ height: GRID_H, overflowY: "scroll", overflowX: "hidden", flexShrink: 0, scrollbarWidth: "thin", scrollbarColor: "rgba(168,85,247,0.3) transparent" }}
      >
        {!loaded ? (
          <PickerSkeleton />
        ) : searchResults ? (
          <div style={{ padding: "8px 6px" }}>
            {searchResults.length === 0 ? (
              <p style={{ color: "#6b7280", fontSize: 13, textAlign: "center", paddingTop: 24 }}>No emoji found</p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(9, 1fr)" }}>
                {searchResults.map((e) => <EmojiButton key={e.emoji} entry={e} onSelect={onEmojiSelect} />)}
              </div>
            )}
          </div>
        ) : (
          CATEGORIES.map((cat) => {
            const emojis = grouped[cat.group] ?? [];
            if (emojis.length === 0) return null;
            return (
              <div key={cat.group} ref={(el) => { sectionRefs.current[cat.group] = el; }}>
                <div style={{ position: "sticky", top: 0, zIndex: 2, background: "#1a1a2e", padding: "6px 10px 4px", fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: "#6b7280" }}>
                  {cat.label}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(9, 1fr)", padding: "0 4px 8px" }}>
                  {emojis.map((e) => <EmojiButton key={e.emoji + e.order} entry={e} onSelect={onEmojiSelect} />)}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Category nav ── */}
      <div style={{ height: NAV_H, flexShrink: 0, display: "flex", alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.06)", padding: "0 4px" }}>
        {CATEGORIES.map((cat) => {
          const isActive = !query && activeGroup === cat.group;
          return (
            <button
              key={cat.group}
              onClick={() => { setQuery(""); jumpTo(cat.group); }}
              title={cat.label}
              style={{ flex: 1, height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, background: "none", border: "none", cursor: "pointer", borderRadius: 6, position: "relative" }}
            >
              <span style={{ opacity: isActive ? 1 : 0.45, transition: "opacity 0.15s" }}>{cat.icon}</span>
              {isActive && (
                <span style={{ position: "absolute", bottom: 4, left: "50%", transform: "translateX(-50%)", width: 4, height: 4, borderRadius: "50%", background: "#c026d3" }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Skeleton shown while emoji data loads ───────────────────────────────────
function PickerSkeleton() {
  return (
    <div style={{ padding: "10px 8px", display: "grid", gridTemplateColumns: "repeat(9, 1fr)", gap: 2 }}>
      {Array.from({ length: 81 }).map((_, i) => (
        <div
          key={i}
          style={{
            height: 36,
            borderRadius: 6,
            background: `rgba(168,85,247,${0.04 + (i % 3) * 0.02})`,
            animation: `shimmer 1.4s ease-in-out ${(i % 9) * 0.06}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

// ── Emoji button ─────────────────────────────────────────────────────────────
function EmojiButton({ entry, onSelect }: { entry: EmojiEntry; onSelect: (e: string) => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={() => onSelect(entry.emoji)}
      title={entry.annotation}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ background: hovered ? "rgba(168,85,247,0.18)" : "transparent", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 22, lineHeight: 1, padding: "5px 2px", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.1s", userSelect: "none" }}
    >
      {entry.emoji}
    </button>
  );
}
