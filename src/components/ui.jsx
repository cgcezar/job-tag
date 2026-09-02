import React from "react";
import { C, SANS, MONO, STAGES, CLOSED, statusColor } from "../lib/constants.js";
import { daysSince } from "../lib/dates.js";

export function Label({ children }) {
  return (
    <div
      className="uppercase mb-2"
      style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.12em", color: C.muted }}
    >
      {children}
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <div className="mb-4">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export const inputStyle = {
  fontFamily: SANS,
  fontSize: 14,
  color: C.ink,
  background: C.card,
  border: `1px solid ${C.rule}`,
  borderRadius: 2,
};

export function TextInput({ style, ...props }) {
  return (
    <input {...props} className="w-full px-3 py-2 outline-none" style={{ ...inputStyle, ...style }} />
  );
}

export function TextArea({ style, ...props }) {
  return (
    <textarea
      {...props}
      className="w-full px-3 py-2 outline-none"
      style={{ ...inputStyle, ...style }}
    />
  );
}

export function Select({ options, ...props }) {
  return (
    <select {...props} className="w-full px-3 py-2 outline-none" style={inputStyle}>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

export function Button({ variant = "primary", children, style, ...props }) {
  const base = {
    fontFamily: MONO,
    fontSize: 11,
    letterSpacing: "0.08em",
    borderRadius: 2,
    textTransform: "uppercase",
  };
  const kinds = {
    primary: { background: C.ink, color: "#fff", border: `1px solid ${C.ink}` },
    ghost: { background: "transparent", color: C.ink, border: `1px solid ${C.rule}` },
    danger: { background: "transparent", color: C.red, border: `1px solid ${C.rule}` },
  };
  return (
    <button
      {...props}
      className="px-4 py-2 inline-flex items-center justify-center gap-2 transition-opacity"
      style={{ ...base, ...kinds[variant], opacity: props.disabled ? 0.45 : 1, ...style }}
    >
      {children}
    </button>
  );
}

export function Notice({ kind = "warn", children }) {
  const tone =
    kind === "ok"
      ? { background: "#E2F1EC", color: C.green }
      : { background: C.goldSoft, color: "#7A5A05" };
  return (
    <div
      className="px-3 py-2 flex items-start gap-2"
      style={{ ...tone, fontFamily: SANS, fontSize: 12.5, borderRadius: 2 }}
    >
      {children}
    </div>
  );
}

export function Modal({ title, onClose, children, footer, wide }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4"
      style={{ background: "rgba(14,26,36,0.45)" }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className={`w-full my-6 ${wide ? "max-w-2xl" : "max-w-md"}`}
        style={{ background: C.card, border: `1px solid ${C.rule}`, borderRadius: 3 }}
      >
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: `1px solid ${C.rule}` }}
        >
          <h2 style={{ fontFamily: SANS, fontSize: 17, fontWeight: 700, color: C.ink }}>{title}</h2>
          <button onClick={onClose} style={{ color: C.muted }} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="px-5 py-5">{children}</div>
        <div
          className="flex items-center justify-between px-5 py-4 gap-3"
          style={{ borderTop: `1px solid ${C.rule}` }}
        >
          {footer}
        </div>
      </div>
    </div>
  );
}

/**
 * The signature element. Five rails for the five stages, plus a silence
 * counter, because how long a company has gone quiet is the number that
 * actually tells you what to do next.
 */
export function StageRail({ status, dateApplied }) {
  const closed = CLOSED.includes(status);
  const idx = closed ? -1 : STAGES.indexOf(status);
  const quiet =
    status === "Applied" || status === "Screening" ? daysSince(dateApplied) : null;

  return (
    <div>
      <div className="flex gap-1 mb-2" aria-hidden="true">
        {STAGES.map((s, i) => (
          <div
            key={s}
            className="flex-1"
            style={{
              height: 3,
              background: closed ? C.rule : i <= idx ? statusColor(status) : C.rule,
              transition: "background 200ms",
            }}
          />
        ))}
      </div>
      <div className="flex items-baseline justify-between gap-3">
        <span
          style={{
            fontFamily: MONO,
            fontSize: 11,
            letterSpacing: "0.08em",
            color: statusColor(status),
            textTransform: "uppercase",
          }}
        >
          {closed && <span style={{ color: C.muted }}>— </span>}
          {status}
        </span>
        {quiet !== null && quiet >= 0 && (
          <span
            style={{ fontFamily: MONO, fontSize: 11, color: quiet >= 14 ? C.red : C.muted }}
            title="Days of silence since you applied"
          >
            {quiet === 0 ? "today" : `${quiet}d quiet`}
          </span>
        )}
      </div>
    </div>
  );
}
