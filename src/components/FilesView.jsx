import React, { useState } from "react";
import { Upload, FileText, Download, Trash2, Loader2, AlertCircle } from "lucide-react";
import { C, SANS, MONO, FILE_KINDS, MAX_FILE_BYTES } from "../lib/constants.js";
import { humanSize, prettyDate } from "../lib/dates.js";
import { downloadBlob } from "../lib/storage.js";
import { Label, Select, Notice } from "./ui.jsx";

export default function FilesView({ files, apps, onUpload, onDelete, busyId, error }) {
  const [kind, setKind] = useState("Resume");
  const [failed, setFailed] = useState(null);

  const pick = (e) => {
    Array.from(e.target.files || []).forEach((f) => onUpload(f, kind));
    e.target.value = "";
  };

  const save = async (meta) => {
    setFailed(null);
    try {
      await downloadBlob(meta.id, meta.name);
    } catch {
      setFailed(`${meta.name} is no longer in storage. It may have been cleared by the browser.`);
    }
  };

  return (
    <div>
      <div
        className="p-5 mb-6"
        style={{ background: C.card, border: `1px solid ${C.rule}`, borderRadius: 3 }}
      >
        <Label>Upload a document</Label>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="sm:w-48">
            <Select value={kind} options={FILE_KINDS} onChange={(e) => setKind(e.target.value)} />
          </div>
          <label
            className="inline-flex items-center gap-2 px-4 py-2 cursor-pointer"
            style={{
              fontFamily: MONO, fontSize: 11, letterSpacing: "0.08em",
              textTransform: "uppercase", background: C.ink,
              color: "#fff", borderRadius: 2,
            }}
          >
            <Upload size={13} /> Choose files
            <input type="file" multiple onChange={pick} className="hidden" />
          </label>
          <span style={{ fontFamily: SANS, fontSize: 12.5, color: C.muted }}>
            Up to {humanSize(MAX_FILE_BYTES)} each. Stored on this device only.
          </span>
        </div>

        {(error || failed) && (
          <div className="mt-3">
            <Notice kind="warn">
              <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{error || failed}</span>
            </Notice>
          </div>
        )}
      </div>

      {files.length === 0 ? (
        <div
          className="px-6 py-14 text-center"
          style={{ background: C.card, border: `1px dashed ${C.rule}` }}
        >
          <p style={{ fontFamily: SANS, fontSize: 15, fontWeight: 600, color: C.ink }}>
            No documents yet
          </p>
          <p className="mt-2" style={{ fontFamily: SANS, fontSize: 13.5, color: C.muted }}>
            Upload your resume here, then tag it on each application so you know which version you
            sent.
          </p>
        </div>
      ) : (
        <div style={{ background: C.card, border: `1px solid ${C.rule}`, borderRadius: 3 }}>
          {files.map((f, i) => {
            const usedBy = apps.filter((a) => (a.fileIds || []).includes(f.id)).length;
            return (
              <div
                key={f.id}
                className="flex items-center gap-3 px-4 py-3"
                style={{ borderTop: i === 0 ? "none" : `1px solid ${C.rule}` }}
              >
                <FileText size={16} style={{ color: C.blue, flexShrink: 0 }} />
                <div className="flex-1 min-w-0">
                  <div
                    className="truncate"
                    style={{ fontFamily: SANS, fontSize: 14, fontWeight: 600, color: C.ink }}
                  >
                    {f.name}
                  </div>
                  <div style={{ fontFamily: MONO, fontSize: 10.5, color: C.muted }}>
                    {f.kind} · {humanSize(f.size)} · added {prettyDate(f.added)}
                    {usedBy > 0 ? ` · sent to ${usedBy}` : ""}
                  </div>
                </div>
                {busyId === f.id ? (
                  <Loader2 size={15} className="animate-spin" style={{ color: C.muted }} />
                ) : (
                  <>
                    <button onClick={() => save(f)} style={{ color: C.ink }} aria-label={`Download ${f.name}`}>
                      <Download size={15} />
                    </button>
                    <button
                      onClick={() => onDelete(f.id)}
                      style={{ color: C.red }}
                      aria-label={`Delete ${f.name}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
