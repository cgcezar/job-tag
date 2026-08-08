import React, { useState } from "react";
import { Download, Link2, Loader2, Trash2, AlertCircle, Paperclip } from "lucide-react";
import {
  C, SANS, MONO, SETUPS, TYPES, ALL_STATUS, uid,
} from "../lib/constants.js";
import { todayKey } from "../lib/dates.js";
import { parseFromUrl, parseFromText } from "../lib/parseJob.js";
import { Field, Label, TextInput, TextArea, Select, Button, Modal, Notice, inputStyle } from "./ui.jsx";

export const blankApplication = () => ({
  id: uid(),
  url: "",
  title: "",
  company: "",
  location: "",
  workSetup: "Unknown",
  employmentType: "Unknown",
  salary: "",
  status: "Applied",
  dateApplied: todayKey(),
  notes: "",
  fileIds: [],
});

export default function ApplicationForm({ initial, files, onSave, onClose, onDelete }) {
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState(null);
  const [showPaste, setShowPaste] = useState(false);
  const [pasted, setPasted] = useState("");

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const merge = (d) =>
    setForm((f) => ({
      ...f,
      title: d.title || f.title,
      company: d.company || f.company,
      location: d.location || f.location,
      workSetup: SETUPS.includes(d.workSetup) && d.workSetup !== "Unknown" ? d.workSetup : f.workSetup,
      employmentType:
        TYPES.includes(d.employmentType) && d.employmentType !== "Unknown"
          ? d.employmentType
          : f.employmentType,
      salary: d.salary || f.salary,
      notes: f.notes || d.notes || "",
    }));

  const readLink = async () => {
    if (!form.url.trim()) {
      setNote({ kind: "warn", text: "Paste a job link first." });
      return;
    }
    setBusy(true);
    setNote(null);
    try {
      const result = await parseFromUrl(form.url.trim());
      merge(result.data);
      if (result.found && (result.data.title || result.data.company)) {
        setNote({ kind: "ok", text: "Filled in from the link. Check the fields before saving." });
      } else {
        setShowPaste(true);
        setNote({
          kind: "warn",
          text: "That posting sits behind a login wall. Open the link, copy the job description, and paste it below.",
        });
      }
    } catch (err) {
      setShowPaste(true);
      setNote({ kind: "warn", text: err.message });
    }
    setBusy(false);
  };

  const readPasted = async () => {
    if (pasted.trim().length < 40) {
      setNote({ kind: "warn", text: "Paste a bit more of the posting so there is something to read." });
      return;
    }
    setBusy(true);
    setNote(null);
    try {
      const result = await parseFromText(pasted);
      merge(result.data);
      setNote({ kind: "ok", text: "Filled in from the pasted text. Check the fields before saving." });
    } catch (err) {
      setNote({ kind: "warn", text: err.message });
    }
    setBusy(false);
  };

  const toggleFile = (id) =>
    setForm((f) => ({
      ...f,
      fileIds: f.fileIds.includes(id) ? f.fileIds.filter((x) => x !== id) : [...f.fileIds, id],
    }));

  const submit = () => {
    if (!form.title.trim() && !form.company.trim()) {
      setNote({ kind: "warn", text: "Add at least a job title or a company." });
      return;
    }
    onSave(form);
  };

  return (
    <Modal
      wide
      title={initial.title || initial.company ? "Edit application" : "New application"}
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
            <Button onClick={submit}>Save application</Button>
          </div>
        </>
      }
    >
      {/* Auto fill */}
      <div className="mb-5 p-4" style={{ background: C.blueSoft, borderRadius: 2 }}>
        <Label>Fill from a job link</Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="flex-1 flex items-center gap-2 px-3" style={inputStyle}>
            <Link2 size={14} style={{ color: C.muted, flexShrink: 0 }} />
            <input
              value={form.url}
              onChange={(e) => set("url", e.target.value)}
              placeholder="https://www.linkedin.com/jobs/view/4441193596/"
              className="w-full py-2 outline-none"
              style={{
                fontFamily: MONO, fontSize: 12, color: C.ink,
                background: "transparent", border: "none",
              }}
            />
          </div>
          <Button onClick={readLink} disabled={busy}>
            {busy ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
            {busy ? "Reading" : "Read link"}
          </Button>
        </div>

        {note && (
          <div className="mt-3">
            <Notice kind={note.kind}>
              <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{note.text}</span>
            </Notice>
          </div>
        )}

        {!showPaste && (
          <button
            onClick={() => setShowPaste(true)}
            className="mt-3"
            style={{
              fontFamily: MONO, fontSize: 10.5, letterSpacing: "0.08em",
              color: C.blue, textTransform: "uppercase",
            }}
          >
            Or paste the job description
          </button>
        )}

        {showPaste && (
          <div className="mt-3">
            <Label>Paste the job description</Label>
            <TextArea
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              rows={5}
              placeholder="Copy everything from the posting page and paste it here."
            />
            <div className="mt-2">
              <Button variant="ghost" onClick={readPasted} disabled={busy}>
                {busy ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                Read pasted text
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
        <Field label="Job title">
          <TextInput value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Junior Software Engineer" />
        </Field>
        <Field label="Company">
          <TextInput value={form.company} onChange={(e) => set("company", e.target.value)} placeholder="Company name" />
        </Field>
        <Field label="Location">
          <TextInput value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Taguig, Metro Manila" />
        </Field>
        <Field label="Pay range">
          <TextInput value={form.salary} onChange={(e) => set("salary", e.target.value)} placeholder="Not stated" />
        </Field>
        <Field label="Work setup">
          <Select value={form.workSetup} options={SETUPS} onChange={(e) => set("workSetup", e.target.value)} />
        </Field>
        <Field label="Employment type">
          <Select value={form.employmentType} options={TYPES} onChange={(e) => set("employmentType", e.target.value)} />
        </Field>
        <Field label="Stage">
          <Select value={form.status} options={ALL_STATUS} onChange={(e) => set("status", e.target.value)} />
        </Field>
        <Field label="Date applied">
          <TextInput type="date" value={form.dateApplied} onChange={(e) => set("dateApplied", e.target.value)} />
        </Field>
      </div>

      <Field label="Notes">
        <TextArea
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          rows={3}
          placeholder="Referral, recruiter name, what to prepare."
        />
      </Field>

      <Field label={`Files sent (${form.fileIds.length})`}>
        {files.length === 0 ? (
          <p style={{ fontFamily: SANS, fontSize: 13, color: C.muted }}>
            Upload a resume in the Files tab first, then you can tag it here.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {files.map((f) => {
              const on = form.fileIds.includes(f.id);
              return (
                <button
                  key={f.id}
                  onClick={() => toggleFile(f.id)}
                  className="px-3 py-1.5 inline-flex items-center gap-2"
                  style={{
                    fontFamily: MONO, fontSize: 11, borderRadius: 2,
                    background: on ? C.ink : "transparent",
                    color: on ? "#fff" : C.muted,
                    border: `1px solid ${on ? C.ink : C.rule}`,
                  }}
                >
                  <Paperclip size={11} />
                  {f.name}
                </button>
              );
            })}
          </div>
        )}
      </Field>
    </Modal>
  );
}
