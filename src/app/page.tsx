"use client";

import { useEffect, useState, useCallback } from "react";
import { AppData } from "@/lib/types";
import {
  loadData,
  saveData,
  createSprint,
  addWordToSprint,
  getWordFrequencies,
} from "@/lib/storage";
import WordCloud from "@/components/WordCloud";
import WordInput from "@/components/WordInput";
import WordList from "@/components/WordList";
import SprintSelector from "@/components/SprintSelector";

export default function Home() {
  const [data, setData] = useState<AppData | null>(null);
  const [viewMode, setViewMode] = useState<"current" | "all">("current");

  useEffect(() => {
    setData(loadData());
  }, []);

  const persist = useCallback((newData: AppData) => {
    setData(newData);
    saveData(newData);
  }, []);

  const handleCreateSprint = (name: string) => {
    if (!data) return;
    const sprint = createSprint(name);
    persist({
      ...data,
      sprints: [sprint, ...data.sprints],
      currentSprintId: sprint.id,
    });
  };

  const handleSelectSprint = (id: string) => {
    if (!data) return;
    persist({ ...data, currentSprintId: id });
  };

  const handleDeleteSprint = (id: string) => {
    if (!data) return;
    const sprints = data.sprints.filter((s) => s.id !== id);
    persist({
      ...data,
      sprints,
      currentSprintId:
        data.currentSprintId === id
          ? sprints[0]?.id ?? null
          : data.currentSprintId,
    });
  };

  const handleAddWord = (word: string, contributor: string) => {
    if (!data || !data.currentSprintId) return;
    persist(addWordToSprint(data, data.currentSprintId, word, contributor));
  };

  const handleRemoveWord = (index: number) => {
    if (!data || !data.currentSprintId) return;
    persist({
      ...data,
      sprints: data.sprints.map((s) =>
        s.id === data.currentSprintId
          ? { ...s, words: s.words.filter((_, i) => i !== index) }
          : s
      ),
    });
  };

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const currentSprint = data.sprints.find((s) => s.id === data.currentSprintId);

  const cloudWords =
    viewMode === "all"
      ? getWordFrequencies(data.sprints.flatMap((s) => s.words))
      : currentSprint
      ? getWordFrequencies(currentSprint.words)
      : [];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-[var(--surface)] bg-opacity-50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[var(--accent)] rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold">Retro Cloud</h1>
              <p className="text-xs text-[var(--text-muted)]">Sprint retrospective word cloud</p>
            </div>
          </div>
          {data.sprints.length > 0 && (
            <div className="flex bg-[var(--surface)] border border-[var(--border)] rounded-lg p-0.5">
              <button
                onClick={() => setViewMode("current")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                  viewMode === "current"
                    ? "bg-[var(--accent)] text-white"
                    : "text-[var(--text-muted)] hover:text-[var(--text)]"
                }`}
              >
                Current Sprint
              </button>
              <button
                onClick={() => setViewMode("all")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                  viewMode === "all"
                    ? "bg-[var(--accent)] text-white"
                    : "text-[var(--text-muted)] hover:text-[var(--text)]"
                }`}
              >
                All Sprints
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Sidebar */}
        <aside className="w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-[var(--border)] bg-[var(--surface)] bg-opacity-30 p-4 sm:p-6 space-y-6">
          <SprintSelector
            sprints={data.sprints}
            currentSprintId={data.currentSprintId}
            onSelect={handleSelectSprint}
            onCreate={handleCreateSprint}
            onDelete={handleDeleteSprint}
          />

          {currentSprint && (
            <>
              <div className="border-t border-[var(--border)] pt-4">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">
                  Add a Word
                </h2>
                <WordInput onSubmit={handleAddWord} />
              </div>

              <div className="border-t border-[var(--border)] pt-4">
                <WordList
                  words={currentSprint.words}
                  onRemove={handleRemoveWord}
                />
              </div>
            </>
          )}
        </aside>

        {/* Word Cloud Area */}
        <main className="flex-1 p-4 sm:p-6">
          <div className="h-full min-h-[500px] bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-4 relative overflow-hidden">
            {currentSprint && (
              <div className="absolute top-4 left-4 z-10">
                <span className="text-xs font-medium text-[var(--text-muted)] bg-[var(--bg)] bg-opacity-80 backdrop-blur-sm px-3 py-1.5 rounded-full border border-[var(--border)]">
                  {viewMode === "all" ? "All Sprints" : currentSprint.name} &middot;{" "}
                  {cloudWords.reduce((sum, w) => sum + w.count, 0)} words
                </span>
              </div>
            )}
            <WordCloud words={cloudWords} />
          </div>
        </main>
      </div>
    </div>
  );
}
