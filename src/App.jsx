import React, { useCallback, useEffect, useState } from "react";
import { Briefcase, Calendar as CalendarIcon, FileText, Loader2, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { C, SANS, MONO, MAX_FILE_BYTES, uid } from "./lib/constants.js";
import { todayKey, humanSize } from "./lib/dates.js";
import {
  KEYS, loadJSON, saveJSON, putBlob, deleteBlob, exportRecords, importRecords,
} from "./lib/storage.js";
import Pipeline from "./components/Pipeline.jsx";
import CalendarView from "./components/CalendarView.jsx";
import FilesView from "./components/FilesView.jsx";
import ApplicationForm, { blankApplication } from "./components/ApplicationForm.jsx";

const TABS = [
  ["pipeline", "Pipeline", Briefcase],
  ["calendar", "Calendar", CalendarIcon],
  ["files", "Files", FileText],
];

export default function App() {
  const [tab, setTab] = useState("pipeline");
  const [apps, setApps] = useState([]);
  const [events, setEvents] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [fileBusy, setFileBusy] = useState(null);
  const [fileError, setFileError] = useState(null);

  useEffect(() => {
    setApps(loadJSON(KEYS.apps, []));
    setEvents(loadJSON(KEYS.events, []));
    setFiles(loadJSON(KEYS.files, []));
    setLoading(false);
  }, []);

  const commitApps = useCallback((next) => {
    setApps(next);
    saveJSON(KEYS.apps, next);
  }, []);
  const commitEvents = useCallback((next) => {
    setEvents(next);
    saveJSON(KEYS.events, next);
  }, []);
  const commitFiles = useCallback((next) => {
    setFiles(next);
    saveJSON(KEYS.files, next);
  }, []);

  const saveApp = (app) => {
    const exists = apps.some((a) => a.id === app.id);
    commitApps(exists ? apps.map((a) => (a.id === app.id ? app : a)) : [app, ...apps]);
    setEditing(null);
  };

  const deleteApp = (id) => {
    commitApps(apps.filter((a) => a.id !== id));
    commitEvents(events.map((e) => (e.appId === id ? { ...e, appId: null } : e)));
    setEditing(null);
  };

  const saveEvent = (ev) => {
    const exists = events.some((e) => e.id === ev.id);
    commitEvents(exists ? events.map((e) => (e.id === ev.id ? ev : e)) : [...events, ev]);
  };

  const uploadFile = async (file, kind) => {
    setFileError(null);
    if (file.size > MAX_FILE_BYTES) {
      setFileError(`${file.name} is ${humanSize(file.size)}. Keep files under ${humanSize(MAX_FILE_BYTES)}.`);
      return;
    }
    const id = uid();
    setFileBusy(id);
    try {
      await putBlob(id, file);
      commitFiles([{ id, name: file.name, size: file.size, kind, added: todayKey() }, ...files]);
    } catch {
      setFileError(`${file.name} could not be saved. Your browser storage may be full.`);
    }
    setFileBusy(null);
  };

  const deleteFile = async (id) => {
    try {
      await deleteBlob(id);
    } catch {
      /* already gone, carry on */
    }
    commitFiles(files.filter((f) => f.id !== id));
    commitApps(apps.map((a) => ({ ...a, fileIds: (a.fileIds || []).filter((x) => x !== id) })));
  };

  const exportBackup = () => {
    const blob = new Blob([JSON.stringify(exportRecords(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `job-applications-${todayKey()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const importBackup = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const restored = importRecords(JSON.parse(await file.text()));
      setApps(restored.apps);
      setEvents(restored.events);
    } catch {
      window.alert("That file could not be read as a backup.");
    }
  };

  const linkStyle = {
    fontFamily: MONO,
    fontSize: 10,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: C.muted,
  };

  return (
    <div className="min-h-screen w-full" style={{ background: C.paper, fontFamily: SANS }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <header
          className="mb-6 pb-5 flex flex-wrap items-end justify-between gap-4"
          style={{ borderBottom: `1px solid ${C.rule}` }}
        >
          <div>
            <div
              style={{
                fontFamily: MONO, fontSize: 10, letterSpacing: "0.18em",
                color: C.muted, textTransform: "uppercase",
              }}
            >
              Your logbook data is saved locally on your device.
            </div>
            <h1
              style={{
                fontFamily: SANS, fontSize: 32, fontWeight: 800, color: C.ink,
                letterSpacing: "-0.03em", lineHeight: 1.1, marginTop: 6,
              }}
            >
              Job Applications
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={exportBackup} className="inline-flex items-center gap-1.5" style={linkStyle}>
              <ArrowDownToLine size={12} /> Export
            </button>
            <label className="inline-flex items-center gap-1.5 cursor-pointer" style={linkStyle}>
              <ArrowUpFromLine size={12} /> Import
              <input type="file" accept="application/json" onChange={importBackup} className="hidden" />
            </label>
          </div>
        </header>

        <nav className="flex gap-1 mb-6">
          {TABS.map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className="px-4 py-2 inline-flex items-center gap-2"
              style={{
                fontFamily: MONO, fontSize: 11, letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: tab === id ? C.ink : C.muted,
                borderBottom: `2px solid ${tab === id ? C.gold : "transparent"}`,
              }}
            >
              <Icon size={13} /> {label}
            </button>
          ))}
        </nav>

        {loading ? (
          <div className="py-20 text-center">
            <Loader2 size={20} className="animate-spin inline" style={{ color: C.muted }} />
          </div>
        ) : (
          <main>
            {tab === "pipeline" && (
              <Pipeline
                apps={apps}
                files={files}
                onEdit={setEditing}
                onNew={() => setEditing(blankApplication())}
              />
            )}
            {tab === "calendar" && (
              <CalendarView
                apps={apps}
                events={events}
                onSaveEvent={saveEvent}
                onDeleteEvent={(id) => commitEvents(events.filter((e) => e.id !== id))}
              />
            )}
            {tab === "files" && (
              <FilesView
                files={files}
                apps={apps}
                onUpload={uploadFile}
                onDelete={deleteFile}
                busyId={fileBusy}
                error={fileError}
              />
            )}
          </main>
        )}

        <footer
          className="mt-10 pt-5"
          style={{ borderTop: `1px solid ${C.rule}`, fontFamily: MONO, fontSize: 10.5, color: C.muted }}
        >
          Everything stays on this device. Export a backup now and then.
        </footer>
      </div>

      {editing && (
        <ApplicationForm
          initial={editing}
          files={files}
          onSave={saveApp}
          onClose={() => setEditing(null)}
          onDelete={apps.some((a) => a.id === editing.id) ? () => deleteApp(editing.id) : null}
        />
      )}
    </div>
  );
}
