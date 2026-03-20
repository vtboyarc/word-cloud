import { AppData, Sprint, WordEntry } from "./types";

export async function loadData(): Promise<AppData> {
  const res = await fetch("/api/sprints");
  if (!res.ok) return { sprints: [], currentSprintId: null };
  return res.json();
}

export function createSprint(name: string): Sprint {
  return {
    id: crypto.randomUUID(),
    name,
    createdAt: Date.now(),
    words: [],
  };
}

function authHeaders(token: string): Record<string, string> {
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

export async function authenticate(password: string): Promise<string | null> {
  const res = await fetch("/api/auth", {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) return null;
  const { token } = await res.json();
  return token;
}

export async function validateToken(token: string): Promise<boolean> {
  const res = await fetch("/api/auth", {
    method: "GET",
    cache: "no-store",
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.ok;
}

export async function logout(token: string): Promise<void> {
  await fetch("/api/auth", {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function saveSprint(sprint: Sprint, token: string): Promise<void> {
  const res = await fetch("/api/sprints", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ id: sprint.id, name: sprint.name, createdAt: sprint.createdAt }),
  });
  if (!res.ok) throw new Error(`Failed to save sprint: ${res.status}`);
}

export async function removeSprint(id: string, token: string): Promise<void> {
  const res = await fetch("/api/sprints", {
    method: "DELETE",
    headers: authHeaders(token),
    body: JSON.stringify({ id }),
  });
  if (!res.ok) throw new Error(`Failed to remove sprint: ${res.status}`);
}

export async function saveWord(sprintId: string, word: string, token: string): Promise<number> {
  const timestamp = Date.now();
  const res = await fetch("/api/words", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ sprintId, word: word.toLowerCase().trim(), timestamp }),
  });
  if (!res.ok) throw new Error(`Failed to save word: ${res.status}`);
  return timestamp;
}

export async function removeWord(sprintId: string, index: number, token: string): Promise<void> {
  const res = await fetch("/api/words", {
    method: "DELETE",
    headers: authHeaders(token),
    body: JSON.stringify({ sprintId, index }),
  });
  if (!res.ok) throw new Error(`Failed to remove word: ${res.status}`);
}

export function addWordToSprint(
  data: AppData,
  sprintId: string,
  word: string,
  timestamp: number
): AppData {
  const entry: WordEntry = {
    word: word.toLowerCase().trim(),
    timestamp,
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

export function deleteSprintFromData(data: AppData, id: string): AppData {
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
