export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const pad = (n) => String(n).padStart(2, "0");

/** Date keys are plain "YYYY-MM-DD" strings so nothing drifts across timezones. */
export const toKey = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;

export function todayKey() {
  const n = new Date();
  return toKey(n.getFullYear(), n.getMonth(), n.getDate());
}

export function prettyDate(key) {
  if (!key) return "";
  const [y, m, d] = key.split("-").map(Number);
  if (!y || !m) return key;
  return `${MONTHS[m - 1].slice(0, 3)} ${d}, ${y}`;
}

/** Whole days between a date key and today. Negative means the date is ahead. */
export function daysSince(key) {
  if (!key) return null;
  const [y, m, d] = key.split("-").map(Number);
  if (!y || !m) return null;
  const then = new Date(y, m - 1, d);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((today - then) / 86400000);
}

/** Leading blanks then day numbers, padded out to full weeks. */
export function monthCells(year, month) {
  const startDay = new Date(year, month, 1).getDay();
  const total = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startDay; i += 1) cells.push(null);
  for (let d = 1; d <= total; d += 1) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function humanSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
