const KEY = 'spc:tutorials:seen';

function load(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) ?? '[]') as string[]);
  } catch {
    return new Set();
  }
}

function save(seen: Set<string>): void {
  localStorage.setItem(KEY, JSON.stringify([...seen]));
}

export function hasSeen(id: string): boolean {
  return load().has(id);
}

export function markSeen(id: string): void {
  const s = load();
  s.add(id);
  save(s);
}

export function resetTutorials(): void {
  localStorage.removeItem(KEY);
}
