import React, { useMemo, useState } from "react";
import { Plus, Search, ExternalLink, Paperclip } from "lucide-react";
import { C, SANS, MONO, ALL_STATUS, CLOSED } from "../lib/constants.js";
import { prettyDate, daysSince } from "../lib/dates.js";
import { Button, StageRail, inputStyle } from "./ui.jsx";

export default function Pipeline({ apps, files, onEdit, onNew }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");

  const counts = useMemo(() => {
    const c = { All: apps.length };
    ALL_STATUS.forEach((s) => {
      c[s] = apps.filter((a) => a.status === s).length;
    });
    return c;
  }, [apps]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return apps
      .filter((a) => filter === "All" || a.status === filter)
      .filter(
        (a) => !q || `${a.title} ${a.company} ${a.location} ${a.notes}`.toLowerCase().includes(q)
      )
      .sort((a, b) => (b.dateApplied || "").localeCompare(a.dateApplied || ""));
  }, [apps, query, filter]);

  const live = apps.filter((a) => !CLOSED.includes(a.status) && a.status !== "Saved").length;
  const interviews = apps.filter((a) => a.status === "Interview").length;
  const stale = apps.filter(
    (a) => (a.status === "Applied" || a.status === "Screening") && daysSince(a.dateApplied) >= 14
  ).length;

  const stats = [
    ["Total sent", apps.length, false],
    ["Still live", live, false],
    ["Interviews", interviews, false],
    ["Quiet 14d+", stale, stale > 0],
  ];

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px mb-6" style={{ background: C.rule }}>
        {stats.map(([label, value, alert]) => (
          <div key={label} className="px-4 py-4" style={{ background: C.card }}>
            <div
              style={{
                fontFamily: MONO, fontSize: 10, letterSpacing: "0.12em",
                color: C.muted, textTransform: "uppercase",
              }}
            >
              {label}
            </div>
            <div
              style={{
                fontFamily: SANS, fontSize: 30, fontWeight: 700,
                color: alert ? C.red : C.ink, lineHeight: 1.1,
              }}
            >
              {value}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="flex-1 flex items-center gap-2 px-3" style={inputStyle}>
          <Search size={14} style={{ color: C.muted }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title, company, notes"
            aria-label="Search applications"
            className="w-full py-2 outline-none"
            style={{
              fontFamily: SANS, fontSize: 14, background: "transparent",
              border: "none", color: C.ink,
            }}
          />
        </div>
        <Button onClick={onNew}>
          <Plus size={13} /> New application
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        {["All", ...ALL_STATUS].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className="px-3 py-1.5"
            style={{
              fontFamily: MONO, fontSize: 10.5, letterSpacing: "0.06em",
              textTransform: "uppercase", borderRadius: 2,
              background: filter === s ? C.ink : "transparent",
              color: filter === s ? "#fff" : C.muted,
              border: `1px solid ${filter === s ? C.ink : C.rule}`,
            }}
          >
            {s} <span style={{ opacity: 0.6 }}>{counts[s] || 0}</span>
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div
          className="px-6 py-14 text-center"
          style={{ background: C.card, border: `1px dashed ${C.rule}` }}
        >
          <p style={{ fontFamily: SANS, fontSize: 15, color: C.ink, fontWeight: 600 }}>
            {apps.length === 0 ? "No applications logged yet" : "Nothing matches that"}
          </p>
          <p className="mt-2 mb-5" style={{ fontFamily: SANS, fontSize: 13.5, color: C.muted }}>
            {apps.length === 0
              ? "Paste a job link and let it fill in the details for you."
              : "Clear the search or pick a different stage."}
          </p>
          {apps.length === 0 && (
            <Button onClick={onNew}>
              <Plus size={13} /> Add your first one
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {shown.map((a) => {
            const tags = [a.workSetup, a.employmentType].filter((t) => t && t !== "Unknown");
            const attached = (a.fileIds || []).filter((id) => files.some((f) => f.id === id));
            return (
              <div
                key={a.id}
                role="button"
                tabIndex={0}
                onClick={() => onEdit(a)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onEdit(a);
                  }
                }}
                className="p-4 cursor-pointer transition-shadow hover:shadow-md"
                style={{ background: C.card, border: `1px solid ${C.rule}`, borderRadius: 3 }}
              >
                <div className="flex items-start justify-between gap-3 mb-1">
                  <h3
                    style={{
                      fontFamily: SANS, fontSize: 16, fontWeight: 700,
                      color: C.ink, letterSpacing: "-0.01em", lineHeight: 1.3,
                    }}
                  >
                    {a.title || "Untitled role"}
                  </h3>
                  {a.url && (
                    <a
                      href={a.url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      style={{ color: C.muted, flexShrink: 0 }}
                      aria-label="Open the original posting"
                    >
                      <ExternalLink size={14} />
                    </a>
                  )}
                </div>

                <div className="mb-3" style={{ fontFamily: SANS, fontSize: 13.5, color: C.muted }}>
                  {a.company || "Company not set"}
                  {a.location ? ` · ${a.location}` : ""}
                </div>

                <div className="flex flex-wrap gap-1.5 mb-4">
                  {tags.map((t) => (
                    <span
                      key={t}
                      className="px-2 py-0.5"
                      style={{
                        fontFamily: MONO, fontSize: 10, color: C.blue,
                        background: C.blueSoft, borderRadius: 2,
                      }}
                    >
                      {t}
                    </span>
                  ))}
                  {a.salary && (
                    <span
                      className="px-2 py-0.5"
                      style={{
                        fontFamily: MONO, fontSize: 10, color: C.muted,
                        border: `1px solid ${C.rule}`, borderRadius: 2,
                      }}
                    >
                      {a.salary}
                    </span>
                  )}
                </div>

                <StageRail status={a.status} dateApplied={a.dateApplied} />

                <div
                  className="flex items-center justify-between mt-3 pt-3 gap-3"
                  style={{
                    borderTop: `1px solid ${C.rule}`,
                    fontFamily: MONO, fontSize: 10.5, color: C.muted,
                  }}
                >
                  <span>Applied {prettyDate(a.dateApplied)}</span>
                  {attached.length > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <Paperclip size={10} /> {attached.length}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
