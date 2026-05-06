export interface WordEntry {
  word: string;
  timestamp: number;
}

export interface Sprint {
  id: string;
  name: string;
  createdAt: number;
  isStandalone: boolean;
  words: WordEntry[];
}

export interface AppData {
  sprints: Sprint[];
  currentSprintId: string | null;
}
