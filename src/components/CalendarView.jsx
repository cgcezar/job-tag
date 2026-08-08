import React, { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Clock, Trash2 } from "lucide-react";
import { C, SANS, MONO, EVENT_TYPES, uid } from "../lib/constants.js";
import { MONTHS, monthCells, toKey, todayKey, prettyDate } from "../lib/dates.js";
import { Button, Field, Label, TextInput, TextArea, Select, Modal, inputStyle } from "./ui.jsx";

function ScheduleForm({ initial, apps, onSave, onClose, onDelete }) {
  const [f, setF] = useState(initial);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  return (
    <Modal
      title={initial.title ? "Edit schedule" : "New schedule"}
      onClose={onClose}
      footer={
        <>
          {onDelete ? (
            <Button variant="danger" onClick={onDelete}>
              <Trash2 size={13} /> Delete
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={() => f.title.trim() && onSave(f)}>Save schedule</Button>
          </div>
        </>
      }
    >
      <Field label="What is it">
        <TextInput
          value={f.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="Technical interview, round 1"
        />
      </Field>
      <div className="grid grid-cols-2 gap-x-4">
        <Field label="Date">
          <TextInput type="date" value={f.date} onChange={(e) => set("date", e.target.value)} />
        </Field>
        <Field label="Time">
          <TextInput type="time" value={f.time} onChange={(e) => set("time", e.target.value)} />
        </Field>
      </div>
      <Field label="Kind">
        <Select value={f.kind} options={EVENT_TYPES} onChange={(e) => set("kind", e.target.value)} />
      </Field>
      <Field label="Linked application">
        <select
          value={f.appId || ""}
          onChange={(e) => set("appId", e.target.value || null)}
          className="w-full px-3 py-2 outline-none"
          style={inputStyle}
        >
          <option value="">Not linked</option>
          {apps.map((a) => (
            <option key={a.id} value={a.id}>
              {`${a.company || "No company"} — ${a.title || "No title"}`}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Notes">
        <TextArea
          value={f.notes}
          onChange={(e) => set("notes", e.target.value)}
          rows={3}
          placeholder="Meeting link, who you are talking to, what to review."
        />
      </Field>
    </Modal>
  );
}

export default function CalendarView({ apps, events, onSaveEvent, onDeleteEvent }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selected, setSelected] = useState(todayKey());
  const [editing, setEditing] = useState(null);

  const today = todayKey();
  const cells = monthCells(year, month);

  const eventsByDay = useMemo(() => {
    const map = {};
    events.forEach((e) => {
      (map[e.date] = map[e.date] || []).push(e);
    });
    return map;
  }, [events]);

  const appsByDay = useMemo(() => {
    const map = {};
    apps.forEach((a) => {
      if (a.dateApplied) (map[a.dateApplied] = map[a.dateApplied] || []).push(a);
    });
    return map;
  }, [apps]);

  const shift = (delta) => {
    let m = month + delta;
    let y = year;
    if (m < 0) {
      m = 11;
      y -= 1;
    }
    if (m > 11) {
      m = 0;
      y += 1;
    }
    setMonth(m);
    setYear(y);
  };

  const upcoming = useMemo(
    () =>
      events
        .filter((e) => e.date >= today)
        .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))
        .slice(0, 5),
    [events, today]
  );

  const dayEvents = (eventsByDay[selected] || []).sort((a, b) =>
    (a.time || "").localeCompare(b.time || "")
  );
  const dayApps = appsByDay[selected] || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <div className="flex items-center justify-between mb-4">
          <h2
            style={{
              fontFamily: SANS, fontSize: 22, fontWeight: 700,
              color: C.ink, letterSpacing: "-0.02em",
            }}
          >
            {MONTHS[month]}{" "}
            <span style={{ fontFamily: MONO, fontWeight: 400, fontSize: 16, color: C.muted }}>
              {year}
            </span>
          </h2>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => shift(-1)} aria-label="Previous month">
              <ChevronLeft size={14} />
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setYear(now.getFullYear());
                setMonth(now.getMonth());
                setSelected(today);
              }}
            >
              Today
            </Button>
            <Button variant="ghost" onClick={() => shift(1)} aria-label="Next month">
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-px mb-px" style={{ background: C.rule }}>
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div
              key={d}
              className="py-2 text-center"
              style={{
                background: C.paper, fontFamily: MONO, fontSize: 10,
                color: C.muted, letterSpacing: "0.08em",
              }}
            >
              {d.toUpperCase()}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-px" style={{ background: C.rule }}>
          {cells.map((d, i) => {
            if (d === null) {
              return <div key={`blank-${i}`} style={{ background: C.paper, minHeight: 74 }} />;
            }
            const key = toKey(year, month, d);
            const evs = eventsByDay[key] || [];
            const aps = appsByDay[key] || [];
            const isToday = key === today;
            const isSelected = key === selected;
            return (
              <button
                key={key}
                onClick={() => setSelected(key)}
                className="p-2 text-left"
                aria-label={prettyDate(key)}
                style={{
                  background: isSelected ? C.blueSoft : C.card,
                  minHeight: 74,
                  outline: isToday ? `2px solid ${C.gold}` : "none",
                  outlineOffset: -2,
                }}
              >
                <div
                  style={{
                    fontFamily: MONO, fontSize: 12,
                    color: isToday ? C.ink : C.muted,
                    fontWeight: isToday ? 700 : 400,
                  }}
                >
                  {d}
                </div>
                <div className="mt-1 flex flex-col gap-1">
                  {evs.slice(0, 2).map((e) => (
                    <div
                      key={e.id}
                      className="truncate px-1"
                      style={{
                        fontFamily: SANS, fontSize: 10.5,
                        background: C.ink, color: "#fff", borderRadius: 1,
                      }}
                    >
                      {e.title}
                    </div>
                  ))}
                  {evs.length > 2 && (
                    <div style={{ fontFamily: MONO, fontSize: 9.5, color: C.muted }}>
                      +{evs.length - 2} more
                    </div>
                  )}
                  {aps.length > 0 && (
                    <div style={{ fontFamily: MONO, fontSize: 9.5, color: C.blue }}>
                      {aps.length} applied
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div
          className="p-4 mb-4"
          style={{ background: C.card, border: `1px solid ${C.rule}`, borderRadius: 3 }}
        >
          <Label>{prettyDate(selected)}</Label>
          <div className="mb-4">
            <Button
              onClick={() =>
                setEditing({
                  id: uid(),
                  title: "",
                  date: selected,
                  time: "",
                  kind: "Interview",
                  appId: null,
                  notes: "",
                })
              }
            >
              <Plus size={13} /> Add schedule
            </Button>
          </div>

          {dayEvents.length === 0 && dayApps.length === 0 && (
            <p style={{ fontFamily: SANS, fontSize: 13, color: C.muted }}>
              Nothing on this day yet.
            </p>
          )}

          {dayEvents.map((e) => {
            const linked = apps.find((a) => a.id === e.appId);
            return (
              <button
                key={e.id}
                onClick={() => setEditing(e)}
                className="w-full text-left p-3 mb-2"
                style={{
                  border: `1px solid ${C.rule}`,
                  borderLeft: `3px solid ${C.gold}`,
                  borderRadius: 2,
                }}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span style={{ fontFamily: SANS, fontSize: 14, fontWeight: 600, color: C.ink }}>
                    {e.title}
                  </span>
                  {e.time && (
                    <span style={{ fontFamily: MONO, fontSize: 11, color: C.muted }}>{e.time}</span>
                  )}
                </div>
                <div style={{ fontFamily: MONO, fontSize: 10.5, color: C.muted, marginTop: 4 }}>
                  {e.kind}
                  {linked ? ` · ${linked.company || linked.title}` : ""}
                </div>
              </button>
            );
          })}

          {dayApps.map((a) => (
            <div
              key={a.id}
              className="p-3 mb-2"
              style={{
                border: `1px solid ${C.rule}`,
                borderLeft: `3px solid ${C.blue}`,
                borderRadius: 2,
              }}
            >
              <div style={{ fontFamily: SANS, fontSize: 13.5, fontWeight: 600, color: C.ink }}>
                {a.title || "Untitled role"}
              </div>
              <div style={{ fontFamily: MONO, fontSize: 10.5, color: C.muted, marginTop: 4 }}>
                Applied · {a.company || "No company"}
              </div>
            </div>
          ))}
        </div>

        <div
          className="p-4"
          style={{ background: C.card, border: `1px solid ${C.rule}`, borderRadius: 3 }}
        >
          <Label>Coming up</Label>
          {upcoming.length === 0 ? (
            <p style={{ fontFamily: SANS, fontSize: 13, color: C.muted }}>No schedules ahead.</p>
          ) : (
            upcoming.map((e) => (
              <div
                key={e.id}
                className="flex items-start gap-3 py-2"
                style={{ borderBottom: `1px solid ${C.rule}` }}
              >
                <Clock size={13} style={{ color: C.muted, marginTop: 3, flexShrink: 0 }} />
                <div>
                  <div style={{ fontFamily: SANS, fontSize: 13.5, color: C.ink, fontWeight: 600 }}>
                    {e.title}
                  </div>
                  <div style={{ fontFamily: MONO, fontSize: 10.5, color: C.muted }}>
                    {prettyDate(e.date)}
                    {e.time ? ` · ${e.time}` : ""}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {editing && (
        <ScheduleForm
          initial={editing}
          apps={apps}
          onSave={(e) => {
            onSaveEvent(e);
            setEditing(null);
          }}
          onClose={() => setEditing(null)}
          onDelete={
            events.some((x) => x.id === editing.id)
              ? () => {
                  onDeleteEvent(editing.id);
                  setEditing(null);
                }
              : null
          }
        />
      )}
    </div>
  );
}
