const KEY = 'spc:pii-acknowledged';
const TWELVE_MONTHS_MS = 365 * 24 * 60 * 60 * 1000;

export function getPiiAcknowledgedAt(): Date | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

export function isPiiAcknowledgementRequired(): boolean {
  const at = getPiiAcknowledgedAt();
  if (!at) return true;
  return Date.now() - at.getTime() > TWELVE_MONTHS_MS;
}

export function setPiiAcknowledged(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, new Date().toISOString());
}
