export const C = {
  paper: "#E9EDF1",
  card: "#FFFFFF",
  ink: "#0E1A24",
  muted: "#5D6E7C",
  rule: "#CFD9E2",
  blue: "#1C5D99",
  blueSoft: "#DDE9F4",
  gold: "#E9A208",
  goldSoft: "#FBEECF",
  red: "#A8324A",
  green: "#1E7A5E",
};

export const SANS =
  '"Inter", "Segoe UI", -apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif';
export const MONO =
  'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace';

export const STAGES = ["Saved", "Applied", "Screening", "Interview", "Offer"];
export const CLOSED = ["Rejected", "Withdrawn"];
export const ALL_STATUS = [...STAGES, ...CLOSED];

export const SETUPS = ["On-site", "Hybrid", "Remote", "Unknown"];
export const TYPES = ["Full-time", "Part-time", "Contract", "Internship", "Unknown"];
export const EVENT_TYPES = ["Interview", "Exam / Assessment", "Follow-up", "Deadline", "Other"];
export const FILE_KINDS = ["Resume", "CV", "Cover letter", "Portfolio", "Certificate", "Other"];

export const MAX_FILE_BYTES = 25 * 1024 * 1024;

export function statusColor(status) {
  if (status === "Offer") return C.green;
  if (status === "Rejected" || status === "Withdrawn") return C.red;
  if (status === "Interview") return C.gold;
  if (status === "Saved") return C.muted;
  return C.blue;
}

export const uid = () =>
  Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
