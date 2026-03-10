"use client";

import { WordEntry } from "@/lib/types";

interface WordListProps {
  words: WordEntry[];
  onRemove: (index: number) => void;
}

export default function WordList({ words, onRemove }: WordListProps) {
  if (words.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
        Submitted Words ({words.length})
      </h3>
      <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
        {words.map((entry, i) => (
          <span
            key={`${entry.word}-${entry.timestamp}-${i}`}
            className="group inline-flex items-center gap-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-full px-3 py-1 text-sm animate-float-in"
            style={{ animationDelay: `${i * 30}ms` }}
          >
            <span className="text-[var(--text)]">{entry.word}</span>
            <span className="text-[var(--text-muted)] text-xs">- {entry.contributor}</span>
            <button
              onClick={() => onRemove(i)}
              className="opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-[var(--danger)] transition-all ml-0.5 cursor-pointer"
            >
              x
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
