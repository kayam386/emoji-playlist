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

type Props = {
  onEmojiSelect: (emoji: string) => void;
};

export default function CustomEmojiPicker({ onEmojiSelect }: Props) {
  const [allEmojis, setAllEmojis] = useState<EmojiEntry[]>([]);
  const [query, setQuery] = useState("");
  const [activeGroup, setActiveGroup] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<number, HTMLDivElement | null>>({});

  // Load emoji data once
  useEffect(() => {
    fetch("/emoji-data.json")
      .then((r) => r.json())
      .then((data: EmojiEntry[]) => {
        // skip group 2 (skin-tone components), sort by order
        const filtered = data
          .filter((e) => e.group !== 2 && e.emoji)
          .sort((a, b) => a.order - b.order);
        setAllEmojis(filtered);
      });
  }, []);

  // Group emojis by category (memoised so it only recomputes when data loads)
  const grouped = useMemo(() => {
    const map: Record<number, EmojiEntry[]> = {};
    for (const cat of CATEGORIES) map[cat.group] = [];
    for (const e of allEmojis) {
      if (map[e.group] !== undefined) map[e.group].push(e);
    }
    return map;
  }, [allEmojis]);

  // Search results — flat list across all categories
  const searchResults = useMemo(() => {
    if (!query.trim()) return null;
    const q = query.toLowerCase();
    return allEmojis.filter(
      (e) =>
        e.annotation.toLowerCase().includes(q) ||
        e.tags?.some((t) => t.toLowerCase().includes(q))
    );
  }, [query, allEmojis]);

  // Track active category while scrolling
  const handleScroll = useCallback(() => {
    if (!scrollRef.current || query) return;
    const containerTop = scrollRef.current.scrollTop;
    let current = CATEGORIES[0].group;
    for (const cat of CATEGORIES) {
      const el = sectionRefs.current[cat.group];
      if (el && el.offsetTop - 4 <= containerTop) current = cat.group;
    }
    setActiveGroup(current);
  }, [query]);

  // Jump to category section
  const jumpTo = (group: number) => {
    const el = sectionRefs.current[group];
    if (el && scrollRef.current) {
      scrollRef.current.scrollTop = el.offsetTop;
      setActiveGroup(group);
    }
  };

  const PICKER_HEIGHT = 360; // total picker height px
  const SEARCH_H    = 44;
  const NAV_H       = 50;
  const GRID_H      = PICKER_HEIGHT - SEARCH_H - NAV_H;

  return (
    <div
      style={{
        height: PICKER_HEIGHT,
        background: "#1a1a2e",
        borderRadius: "0.75rem",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* ── Search bar ── */}
      <div
        style={{
          height: SEARCH_H,
          padding: "8px 10px",
          flexShrink: 0,
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "rgba(255,255,255,0.07)",
            borderRadius: 8,
            padding: "0 10px",
            height: "100%",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search emoji"
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "#fff",
              fontSize: 14,
              caretColor: "#a855f7",
            }}
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "#6b7280", lineHeight: 1 }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── Emoji grid (the only scrollable element) ── */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={{
          height: GRID_H,
          overflowY: "scroll",
          overflowX: "hidden",
          flexShrink: 0,
          // Custom scrollbar
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(168,85,247,0.3) transparent",
        }}
      >
        {searchResults ? (
          /* ── Search results (flat grid) ── */
          <div style={{ padding: "8px 6px" }}>
            {searchResults.length === 0 ? (
              <p style={{ color: "#6b7280", fontSize: 13, textAlign: "center", paddingTop: 24 }}>
                No emoji found
              </p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(9, 1fr)" }}>
                {searchResults.map((e) => (
                  <EmojiButton key={e.emoji} entry={e} onSelect={onEmojiSelect} />
                ))}
              </div>
            )}
          </div>
        ) : (
          /* ── Grouped view with sticky headers ── */
          CATEGORIES.map((cat) => {
            const emojis = grouped[cat.group] ?? [];
            if (emojis.length === 0) return null;
            return (
              <div
                key={cat.group}
                ref={(el) => { sectionRefs.current[cat.group] = el; }}
              >
                {/* Sticky category label */}
                <div
                  style={{
                    position: "sticky",
                    top: 0,
                    zIndex: 2,
                    background: "#1a1a2e",
                    padding: "6px 10px 4px",
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    color: "#6b7280",
                  }}
                >
                  {cat.label}
                </div>

                {/* Emoji grid for this category */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(9, 1fr)",
                    padding: "0 4px 8px",
                  }}
                >
                  {emojis.map((e) => (
                    <EmojiButton key={e.emoji + e.order} entry={e} onSelect={onEmojiSelect} />
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Category nav (fixed at bottom) ── */}
      <div
        style={{
          height: NAV_H,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          padding: "0 4px",
        }}
      >
        {CATEGORIES.map((cat) => {
          const isActive = !query && activeGroup === cat.group;
          return (
            <button
              key={cat.group}
              onClick={() => { setQuery(""); jumpTo(cat.group); }}
              title={cat.label}
              style={{
                flex: 1,
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                background: "none",
                border: "none",
                cursor: "pointer",
                borderRadius: 6,
                transition: "background 0.15s",
                position: "relative",
              }}
            >
              <span style={{ opacity: isActive ? 1 : 0.45, transition: "opacity 0.15s" }}>
                {cat.icon}
              </span>
              {isActive && (
                <span
                  style={{
                    position: "absolute",
                    bottom: 4,
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: 4,
                    height: 4,
                    borderRadius: "50%",
                    background: "#c026d3",
                  }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Individual emoji button ─────────────────────────────────────────────────
function EmojiButton({ entry, onSelect }: { entry: EmojiEntry; onSelect: (e: string) => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={() => onSelect(entry.emoji)}
      title={entry.annotation}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? "rgba(168,85,247,0.18)" : "transparent",
        border: "none",
        borderRadius: 6,
        cursor: "pointer",
        fontSize: 22,
        lineHeight: 1,
        padding: "5px 2px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "background 0.1s",
        userSelect: "none",
      }}
    >
      {entry.emoji}
    </button>
  );
}
