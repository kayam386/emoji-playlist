"use client";

import { useEffect, useRef } from "react";

type EmojiPickerElement = HTMLElement & {
  dataSource: string;
  addEventListener(type: "emoji-click", listener: (e: CustomEvent<{ emoji: { unicode: string } }>) => void): void;
  removeEventListener(type: "emoji-click", listener: (e: CustomEvent<{ emoji: { unicode: string } }>) => void): void;
};

type Props = {
  onEmojiSelect: (emoji: string) => void;
  selected: string[];
};

export default function EmojiPicker({ onEmojiSelect, selected: _selected }: Props) {
  const ref = useRef<EmojiPickerElement>(null);

  useEffect(() => {
    import("emoji-picker-element").then(() => {
      const el = ref.current;
      if (el) {
        // Point to local complete dataset so no CDN dependency and all 1923 emojis load
        el.dataSource = "/emoji-data.json";
      }
    });
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handler = (e: CustomEvent<{ emoji: { unicode: string } }>) => {
      if (e.detail?.emoji?.unicode) {
        onEmojiSelect(e.detail.emoji.unicode);
      }
    };

    el.addEventListener("emoji-click", handler);
    return () => el.removeEventListener("emoji-click", handler);
  }, [onEmojiSelect]);

  return (
    // @ts-expect-error - emoji-picker is a custom element
    <emoji-picker ref={ref} class="w-full" />
  );
}
