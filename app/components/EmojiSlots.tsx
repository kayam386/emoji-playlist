"use client";

type Props = {
  selected: string[];
  onRemove: (index: number) => void;
};

export default function EmojiSlots({ selected, onRemove }: Props) {
  return (
    <div className="flex items-center gap-3 mb-4">
      {Array.from({ length: 5 }).map((_, i) => {
        const emoji = selected[i];
        const isActive = i === selected.length && selected.length < 5;
        return (
          <button
            key={i}
            onClick={() => emoji && onRemove(i)}
            className="w-14 h-14 rounded-full flex items-center justify-center text-2xl transition-all duration-150"
            style={{
              background: emoji ? "#2a1a4e" : "#1a1a2e",
              border: isActive ? "2px solid #a855f7" : "2px solid transparent",
              boxShadow: isActive ? "0 0 12px rgba(168, 85, 247, 0.5)" : "none",
              cursor: emoji ? "pointer" : "default",
            }}
            aria-label={emoji ? `Remove ${emoji}` : `Slot ${i + 1}`}
          >
            {emoji || ""}
          </button>
        );
      })}
    </div>
  );
}
