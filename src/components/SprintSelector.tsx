"use client";

import { Sprint } from "@/lib/types";
import { useState } from "react";

interface SprintSelectorProps {
  sprints: Sprint[];
  currentSprintId: string | null;
  onSelect: (id: string) => void;
  onCreate: (name: string) => void;
  onDelete: (id: string) => void;
}

export default function SprintSelector({
  sprints,
  currentSprintId,
  onSelect,
  onCreate,
  onDelete,
}: SprintSelectorProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");

  const handleCreate = () => {
    if (newName.trim()) {
      onCreate(newName.trim());
      setNewName("");
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Sprints
        </h2>
        <button
          onClick={() => setIsCreating(!isCreating)}
          className="text-[var(--accent)] hover:text-[var(--accent-hover)] text-sm font-medium transition-colors cursor-pointer"
        >
          {isCreating ? "Cancel" : "+ New Sprint"}
        </button>
      </div>

      {isCreating && (
        <div className="flex gap-2 animate-float-in">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="Sprint name (e.g. Sprint 24)"
            autoFocus
            className="flex-1 bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
          />
          <button
            onClick={handleCreate}
            className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
          >
            Create
          </button>
        </div>
      )}

      <div className="space-y-1 max-h-60 overflow-y-auto">
        {sprints.length === 0 && (
          <p className="text-sm text-[var(--text-muted)] py-2">
            No sprints yet. Create one to get started.
          </p>
        )}
        {sprints.map((sprint) => (
          <div
            key={sprint.id}
            onClick={() => onSelect(sprint.id)}
            className={`group flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-all ${
              sprint.id === currentSprintId
                ? "bg-[var(--accent)] bg-opacity-15 border border-[var(--accent)] border-opacity-30"
                : "hover:bg-[var(--surface-hover)] border border-transparent"
            }`}
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{sprint.name}</p>
              <p className="text-xs text-[var(--text-muted)]">
                {sprint.words.length} word{sprint.words.length !== 1 ? "s" : ""} &middot;{" "}
                {new Date(sprint.createdAt).toLocaleDateString()}
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Delete "${sprint.name}"?`)) {
                  onDelete(sprint.id);
                }
              }}
              className="opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-[var(--danger)] transition-all ml-2 cursor-pointer"
              title="Delete sprint"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
