import { AppData, Sprint, WordEntry } from "./types";

const STORAGE_KEY = "retro-word-cloud-data";

function getDefaultData(): AppData {
  return {
    sprints: [],
    currentSprintId: null,
  };
}

export function loadData(): AppData {
  if (typeof window === "undefined") return getDefaultData();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultData();
    return JSON.parse(raw) as AppData;
  } catch {
    return getDefaultData();
  }
}

export function saveData(data: AppData): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function createSprint(name: string): Sprint {
  return {
    id: crypto.randomUUID(),
    name,
    createdAt: Date.now(),
    words: [],
  };
}

export function addWordToSprint(
  data: AppData,
  sprintId: string,
  word: string
): AppData {
  const entry: WordEntry = {
    word: word.toLowerCase().trim(),
    timestamp: Date.now(),
  };
  return {
    ...data,
    sprints: data.sprints.map((s) =>
      s.id === sprintId ? { ...s, words: [...s.words, entry] } : s
    ),
  };
}

export function removeWordFromSprint(
  data: AppData,
  sprintId: string,
  index: number
): AppData {
  return {
    ...data,
    sprints: data.sprints.map((s) =>
      s.id === sprintId ? { ...s, words: s.words.filter((_, i) => i !== index) } : s
    ),
  };
}

export function deleteSprint(data: AppData, id: string): AppData {
  const sprints = data.sprints.filter((s) => s.id !== id);
  return {
    ...data,
    sprints,
    currentSprintId:
      data.currentSprintId === id ? sprints[0]?.id ?? null : data.currentSprintId,
  };
}

export function getWordFrequencies(
  words: WordEntry[]
): { text: string; count: number }[] {
  const freq = new Map<string, number>();
  for (const w of words) {
    freq.set(w.word, (freq.get(w.word) || 0) + 1);
  }
  return Array.from(freq.entries())
    .map(([text, count]) => ({ text, count }))
    .sort((a, b) => b.count - a.count);
}
