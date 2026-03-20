"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { AppData } from "@/lib/types";
import {
  loadData,
  createSprint,
  saveSprint,
  removeSprint,
  saveWord,
  removeWord,
  authenticate,
  validateToken,
  logout,
  addWordToSprint,
  removeWordFromSprint,
  deleteSprintFromData,
  getWordFrequencies,
} from "@/lib/storage";
import WordCloud from "@/components/WordCloud";
import WordInput from "@/components/WordInput";
import WordList from "@/components/WordList";
import SprintSelector from "@/components/SprintSelector";

const VIEW_MODES = [
  { value: "current", label: "Current Sprint" },
  { value: "all", label: "All Sprints" },
] as const;

type ViewMode = (typeof VIEW_MODES)[number]["value"];

const CURRENT_SPRINT_STORAGE_KEY = "retro-cloud-current-sprint-id";

function resolveCurrentSprintId(data: AppData, preferredSprintId?: string | null) {
  if (preferredSprintId && data.sprints.some((sprint) => sprint.id === preferredSprintId)) {
    return preferredSprintId;
  }
  return data.currentSprintId;
}

export default function Home() {
  const [data, setData] = useState<AppData | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("current");
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const isUnlocked = !!authToken;

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticating(true);
    try {
      const token = await authenticate(password);
      if (token) {
        setAuthToken(token);
        window.localStorage.setItem("retro-cloud-auth-token", token);
        setPassword("");
        setPasswordError(false);
      } else {
        setPasswordError(true);
        setTimeout(() => setPasswordError(false), 2000);
      }
    } catch {
      setPasswordError(true);
      setTimeout(() => setPasswordError(false), 2000);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLock = async () => {
    if (authToken) await logout(authToken);
    window.localStorage.removeItem("retro-cloud-auth-token");
    setAuthToken(null);
  };

  useEffect(() => {
    let isActive = true;

    const loadInitialData = async () => {
      const savedSprintId = window.localStorage.getItem(CURRENT_SPRINT_STORAGE_KEY);
      const latestData = await loadData();
      const currentSprintId = resolveCurrentSprintId(latestData, savedSprintId);

      if (!isActive) return;

      setData((prev) => prev ?? { ...latestData, currentSprintId });
    };

    loadInitialData();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    const savedToken = window.localStorage.getItem("retro-cloud-auth-token");
    if (!savedToken) return;

    validateToken(savedToken).then((isValid) => {
      if (isValid) {
        setAuthToken(savedToken);
      } else {
        window.localStorage.removeItem("retro-cloud-auth-token");
      }
    });
  }, []);

  useEffect(() => {
    if (!data) return;
    if (data.currentSprintId) {
      window.localStorage.setItem(CURRENT_SPRINT_STORAGE_KEY, data.currentSprintId);
    } else {
      window.localStorage.removeItem(CURRENT_SPRINT_STORAGE_KEY);
    }
  }, [data]);

  const handleCreateSprint = useCallback(async (name: string) => {
    if (!authToken) return;
    const sprint = createSprint(name);
    await saveSprint(sprint, authToken);
    setData((prev) =>
      prev
        ? { ...prev, sprints: [sprint, ...prev.sprints], currentSprintId: sprint.id }
        : prev
    );
  }, [authToken]);

  const handleSelectSprint = useCallback((id: string) => {
    setData((prev) => (prev ? { ...prev, currentSprintId: id } : prev));
  }, []);

  const handleDeleteSprint = useCallback(async (id: string) => {
    if (!authToken) return;
    await removeSprint(id, authToken);
    setData((prev) => (prev ? deleteSprintFromData(prev, id) : prev));
  }, [authToken]);

  const handleAddWord = useCallback(async (word: string) => {
    if (!authToken) return;
    const sprintId = data?.currentSprintId;
    if (!sprintId) return;
    const timestamp = await saveWord(sprintId, word, authToken);
    setData((prev) => (prev ? addWordToSprint(prev, sprintId, word, timestamp) : prev));
  }, [authToken, data?.currentSprintId]);

  const handleRemoveWord = useCallback(async (index: number) => {
    if (!authToken) return;
    const sprintId = data?.currentSprintId;
    if (!sprintId) return;
    await removeWord(sprintId, index, authToken);
    setData((prev) => (prev ? removeWordFromSprint(prev, sprintId, index) : prev));
  }, [authToken, data?.currentSprintId]);

  const currentSprint = useMemo(
    () => data?.sprints.find((s) => s.id === data.currentSprintId) ?? null,
    [data]
  );

  const cloudWords = useMemo(() => {
    if (!data) return [];
    if (viewMode === "all") {
      return getWordFrequencies(data.sprints.flatMap((s) => s.words));
    }
    return currentSprint ? getWordFrequencies(currentSprint.words) : [];
  }, [data, viewMode, currentSprint]);

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
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
          <div className="flex items-center gap-3">
            {data.sprints.length > 0 && (
              <div className="flex bg-[var(--surface)] border border-[var(--border)] rounded-lg p-0.5">
                {VIEW_MODES.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setViewMode(value)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                      viewMode === value
                        ? "bg-[var(--accent)] text-white"
                        : "text-[var(--text-muted)] hover:text-[var(--text)]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
            {isUnlocked ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-green-400 font-medium">Unlocked</span>
                <button
                  onClick={handleLock}
                  className="text-xs text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors cursor-pointer"
                >
                  Lock
                </button>
              </div>
            ) : (
              <form onSubmit={handlePasswordSubmit} className="flex items-center gap-2">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  autoComplete="current-password"
                  disabled={isAuthenticating}
                  className={`w-28 bg-[var(--surface)] border rounded-lg px-2.5 py-1.5 text-xs text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none transition-colors disabled:opacity-60 ${
                    passwordError
                      ? "border-[var(--danger)] shake"
                      : "border-[var(--border)] focus:border-[var(--accent)]"
                  }`}
                />
                <button
                  type="submit"
                  disabled={isAuthenticating}
                  className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer disabled:opacity-60"
                >
                  {isAuthenticating ? "Checking..." : "Unlock"}
                </button>
                <span className="text-xs text-amber-400 font-medium px-2 py-1 bg-amber-400/10 border border-amber-400/20 rounded-full whitespace-nowrap">
                  Read Only Mode
                </span>
              </form>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row">
        <aside className="w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-[var(--border)] bg-[var(--surface)] bg-opacity-30 p-4 sm:p-6 space-y-6">
          <SprintSelector
            sprints={data.sprints}
            currentSprintId={data.currentSprintId}
            onSelect={handleSelectSprint}
            onCreate={handleCreateSprint}
            onDelete={handleDeleteSprint}
            readOnly={!isUnlocked}
          />

          {currentSprint && (
            <>
              {isUnlocked && (
                <div className="border-t border-[var(--border)] pt-4">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">
                    Add a Word
                  </h2>
                  <WordInput onSubmit={handleAddWord} />
                </div>
              )}

              <div className="border-t border-[var(--border)] pt-4">
                <WordList
                  words={currentSprint.words}
                  onRemove={handleRemoveWord}
                  readOnly={!isUnlocked}
                />
              </div>
            </>
          )}
        </aside>

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
