"use client";

import { useState } from "react";

interface WordInputProps {
  onSubmit: (word: string, contributor: string) => void;
}

export default function WordInput({ onSubmit }: WordInputProps) {
  const [word, setWord] = useState("");
  const [contributor, setContributor] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (word.trim() && contributor.trim()) {
      onSubmit(word.trim(), contributor.trim());
      setWord("");
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 1500);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">
          Your Name
        </label>
        <input
          type="text"
          value={contributor}
          onChange={(e) => setContributor(e.target.value)}
          placeholder="e.g. Alex"
          className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">
          Word to describe this sprint
        </label>
        <input
          type="text"
          value={word}
          onChange={(e) => setWord(e.target.value)}
          placeholder="e.g. productive, chaotic, fun"
          className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
        />
      </div>
      <button
        type="submit"
        className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
          submitted
            ? "bg-green-600 text-white"
            : "bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white glow-pulse"
        }`}
      >
        {submitted ? "✓ Added!" : "Add Word"}
      </button>
    </form>
  );
}
