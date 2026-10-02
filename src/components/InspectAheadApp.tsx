"use client";

import { useMemo, useState } from "react";
import { todayIso } from "@/lib/dates";
import { generateIcs, icsFilename } from "@/lib/generate-ics";
import { generateReminders } from "@/lib/generate-reminders";
import { ocrImageFile, parseScheduleFile } from "@/lib/parse-file";
import { detectInspections, parseCsvText, parsePlainTextSchedule } from "@/lib/parse-schedule";
import type { DetectedInspection, ReminderOptions, ScheduleActivity } from "@/lib/types";
import { DEFAULT_REMINDER_OPTIONS } from "@/lib/types";

const KINDS = [
  "foundation",
  "framing",
  "electrical",
  "plumbing",
  "mechanical",
  "fire",
  "insulation",
  "final",
  "special",
  "generic",
] as const;

function downloadText(filename: string, contents: string, type: string) {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function InspectAheadApp() {
  const [projectName, setProjectName] = useState("Project look-ahead");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [ocrText, setOcrText] = useState("");
  const [showCritique, setShowCritique] = useState(true);
  const [activities, setActivities] = useState<ScheduleActivity[]>([]);
  const [inspections, setInspections] = useState<DetectedInspection[]>([]);
  const [options, setOptions] = useState<ReminderOptions>({
    ...DEFAULT_REMINDER_OPTIONS,
    today: todayIso(),
  });

  const events = useMemo(
    () => generateReminders(inspections, options),
    [inspections, options],
  );

  const otherActivities = useMemo(() => {
    const taken = new Set(inspections.map((row) => row.activity.id));
    return activities.filter(
      (activity) => !taken.has(activity.id) && Boolean(activity.finish ?? activity.start),
    );
  }, [activities, inspections]);

  function applyActivities(next: ScheduleActivity[], sourceLabel: string) {
    const detected = detectInspections(next);
    setActivities(next);
    setInspections(detected);
    setError("");
    setStatus(
      `${sourceLabel}: ${next.length} rows, ${detected.filter((row) => row.included).length} inspection milestones.`,
    );
  }

  async function handleFiles(files: FileList | File[]) {
    const file = files[0];
    if (!file) return;
    setError("");
    const name = file.name.toLowerCase();
    const isImage = file.type.startsWith("image/") || /\.(png|jpe?g|webp|gif|bmp|tif?f)$/i.test(name);

    try {
      if (isImage) {
        setStatus("Reading the photo. This is OCR, so expect mistakes.");
        const text = await ocrImageFile(file);
        setOcrText(text);
        const parsed = parsePlainTextSchedule(text);
        applyActivities(parsed, file.name);
        if (parsed.length === 0) {
          setError("OCR did not find dated tasks. Fix the text below and click Parse text.");
        }
        return;
      }
      setStatus(`Reading ${file.name}...`);
      const parsed = await parseScheduleFile(file);
      applyActivities(parsed, file.name);
      setOcrText("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not read that file.");
      setStatus("");
    }
  }

  async function loadSample() {
    const response = await fetch("/sample-lookahead.csv");
    const csv = await response.text();
    applyActivities(parseCsvText(csv), "Sample look-ahead");
    setProjectName("Sample mixed-use look-ahead");
    setOcrText("");
  }

  function parseOcrBox() {
    applyActivities(parsePlainTextSchedule(ocrText), "Edited text");
  }

  function addActivity(activity: ScheduleActivity) {
    const date = activity.finish ?? activity.start ?? "";
    const next: DetectedInspection = {
      id: `insp-${activity.id}`,
      activity,
      kind: "generic",
      date,
      included: true,
      confidence: "low",
      reason: "Added by hand",
    };
    setInspections((current) => [...current, next]);
  }

  function updateInspection(id: string, patch: Partial<DetectedInspection>) {
    setInspections((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  }

  function downloadCalendar() {
    if (events.length === 0) {
      setError("No reminder events to export. Include at least one dated inspection.");
      return;
    }
    const ics = generateIcs(events, `${projectName} inspections`);
    downloadText(icsFilename(projectName, options.today || todayIso()), ics, "text/calendar");
    setStatus(`Downloaded ${events.length} calendar events.`);
  }

  const includedCount = inspections.filter((row) => row.included && row.date).length;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 pb-20">
      <header className="mb-8 flex flex-col gap-4 border-b border-rule pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-mono text-xs tracking-[0.18em] text-warn uppercase">Job trailer tool</p>
          <h1 className="mt-1 text-4xl font-semibold tracking-tight">InspectAhead</h1>
          <p className="mt-2 max-w-2xl text-base leading-6 text-ink/80">
            Read a look-ahead. Find inspection milestones. Put chase, readiness, and inspection
            reminders on the superintendent&apos;s phone calendar.
          </p>
        </div>
        <div className="font-mono text-sm text-ink/70">
          {includedCount} inspections · {events.length} reminders
        </div>
      </header>

      {showCritique ? (
        <section className="mb-8 border border-ink bg-card p-5">
          <div className="flex items-start justify-between gap-4">
            <h2 className="text-lg font-semibold">Be honest about this idea</h2>
            <button
              type="button"
              className="font-mono text-xs uppercase tracking-wide text-ink/60"
              onClick={() => setShowCritique(false)}
            >
              Hide
            </button>
          </div>
          <div className="mt-3 grid gap-4 text-sm leading-6 md:grid-cols-2">
            <div>
              <p className="font-medium">This already exists in pieces.</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>Procore, Buildertrend, Autodesk Build, and SuperConstruct already schedule inspections and sync calendars.</li>
                <li>Photocalia and other AI tools already turn a photo into an .ics file.</li>
                <li>InspectPilot and similar products auto-request city inspections in some markets.</li>
              </ul>
            </div>
            <div>
              <p className="font-medium">The real gap is narrower.</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>Small GCs still run Excel look-aheads and a printed Gantt in the trailer.</li>
                <li>The miss is not the inspection date. It is the 5-day prep: chase sub reports, walk the work, then call the AHJ.</li>
                <li>A static calendar file goes stale as soon as the look-ahead slips. Re-export every week or this creates false confidence.</li>
                <li>Photo OCR of a Gantt is unreliable. Review every row before you import.</li>
              </ul>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6">
            Best output for v1 is still <strong>.ics</strong>. It works in Apple, Google, and Outlook with no login.
            Calendar apps are bad checklists, so the checklist lives in the event notes. If this workflow earns a weekly habit, the next step is a live calendar feed, not a startup.
          </p>
        </section>
      ) : null}

      <section className="mb-6 grid gap-4 md:grid-cols-[1.3fr_0.7fr]">
        <label
          className="flex min-h-48 cursor-pointer flex-col items-center justify-center border-2 border-dashed border-ink bg-card px-6 py-10 text-center"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            void handleFiles(event.dataTransfer.files);
          }}
        >
          <span className="text-lg font-semibold">Drop a look-ahead</span>
          <span className="mt-2 max-w-md text-sm text-ink/70">
            Spreadsheet (.xlsx, .xls, .csv) is the reliable path. A photo of a printed schedule works only after you fix the OCR text.
          </span>
          <input
            className="sr-only"
            type="file"
            accept=".csv,.xlsx,.xls,.txt,image/*"
            onChange={(event) => {
              if (event.target.files) void handleFiles(event.target.files);
            }}
          />
        </label>
        <div className="flex flex-col gap-3 border border-rule bg-card p-4">
          <label className="text-sm font-medium">
            Project name
            <input
              className="mt-1 w-full border border-rule bg-paper px-3 py-2"
              value={projectName}
              onChange={(event) => setProjectName(event.target.value)}
            />
          </label>
          <label className="text-sm font-medium">
            Chase subs (business days before)
            <input
              className="mt-1 w-full border border-rule bg-paper px-3 py-2"
              type="number"
              min={1}
              max={15}
              value={options.chaseBusinessDaysBefore}
              onChange={(event) =>
                setOptions((current) => ({
                  ...current,
                  chaseBusinessDaysBefore: Number(event.target.value) || 5,
                }))
              }
            />
          </label>
          <label className="text-sm font-medium">
            Readiness walk (business days before)
            <input
              className="mt-1 w-full border border-rule bg-paper px-3 py-2"
              type="number"
              min={0}
              max={10}
              value={options.readinessBusinessDaysBefore}
              onChange={(event) =>
                setOptions((current) => ({
                  ...current,
                  readinessBusinessDaysBefore: Number(event.target.value) || 0,
                }))
              }
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={options.skipPast}
              onChange={(event) =>
                setOptions((current) => ({ ...current, skipPast: event.target.checked }))
              }
            />
            Skip reminders already in the past
          </label>
          <button
            type="button"
            className="border border-ink px-3 py-2 text-sm font-medium hover:bg-mark"
            onClick={() => void loadSample()}
          >
            Load sample look-ahead
          </button>
        </div>
      </section>

      {status ? <p className="mb-3 font-mono text-sm">{status}</p> : null}
      {error ? <p className="mb-3 text-sm text-bad">{error}</p> : null}

      {ocrText ? (
        <section className="mb-6 border border-rule bg-card p-4">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 className="font-semibold">OCR text. Fix it before you trust it.</h2>
            <button
              type="button"
              className="border border-ink px-3 py-1.5 text-sm hover:bg-mark"
              onClick={parseOcrBox}
            >
              Parse text
            </button>
          </div>
          <textarea
            className="h-40 w-full border border-rule bg-paper p-3 font-mono text-sm"
            value={ocrText}
            onChange={(event) => setOcrText(event.target.value)}
          />
        </section>
      ) : null}

      {inspections.length > 0 ? (
        <section className="mb-6 overflow-x-auto border border-ink bg-card">
          <div className="flex items-center justify-between border-b border-rule px-4 py-3">
            <h2 className="font-semibold">Inspections to put on the calendar</h2>
            <span className="font-mono text-xs uppercase tracking-wide text-ink/60">
              Review every date
            </span>
          </div>
          <table className="min-w-full text-left text-sm">
            <thead className="bg-paper font-mono text-xs uppercase tracking-wide">
              <tr>
                <th className="px-3 py-2">On</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Milestone</th>
                <th className="px-3 py-2">Kind</th>
                <th className="px-3 py-2">Why</th>
              </tr>
            </thead>
            <tbody>
              {inspections.map((row) => (
                <tr key={row.id} className="border-t border-rule align-top">
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={row.included}
                      onChange={(event) =>
                        updateInspection(row.id, { included: event.target.checked })
                      }
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="date"
                      className="border border-rule bg-paper px-2 py-1"
                      value={row.date}
                      onChange={(event) => updateInspection(row.id, { date: event.target.value })}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium">{row.activity.name}</div>
                    <div className="text-xs text-ink/60">
                      {row.activity.trade ?? "No trade"} · {row.confidence}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <select
                      className="border border-rule bg-paper px-2 py-1"
                      value={row.kind}
                      onChange={(event) =>
                        updateInspection(row.id, {
                          kind: event.target.value as DetectedInspection["kind"],
                        })
                      }
                    >
                      {KINDS.map((kind) => (
                        <option key={kind} value={kind}>
                          {kind}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2 text-xs text-ink/70">{row.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      {otherActivities.length > 0 ? (
        <section className="mb-6 border border-rule bg-card p-4">
          <h2 className="font-semibold">Other dated tasks. Add one if the parser missed an inspection.</h2>
          <ul className="mt-3 divide-y divide-rule">
            {otherActivities.slice(0, 12).map((activity) => (
              <li key={activity.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span>
                  <span className="font-mono text-xs">{activity.finish ?? activity.start}</span>{" "}
                  {activity.name}
                </span>
                <button
                  type="button"
                  className="border border-ink px-2 py-1 text-xs hover:bg-mark"
                  onClick={() => addActivity(activity)}
                >
                  Add
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {events.length > 0 ? (
        <section className="mb-6 border border-ink bg-card">
          <div className="flex flex-col gap-3 border-b border-rule px-4 py-3 md:flex-row md:items-center md:justify-between">
            <h2 className="font-semibold">Reminders that will land on the calendar</h2>
            <button
              type="button"
              className="bg-ink px-4 py-2 text-sm font-medium text-paper hover:bg-mark hover:text-ink"
              onClick={downloadCalendar}
            >
              Download .ics
            </button>
          </div>
          <ol className="divide-y divide-rule">
            {events.map((event) => (
              <li key={event.id} className="grid gap-2 px-4 py-3 md:grid-cols-[9rem_7rem_1fr]">
                <div className="font-mono text-sm">{event.date}</div>
                <div className="text-xs font-semibold tracking-wide uppercase text-warn">
                  {event.kind.replace("_", " ")}
                </div>
                <div>
                  <div className="font-medium">{event.title}</div>
                  <p className="mt-1 text-sm text-ink/75">{event.notes}</p>
                  <ul className="mt-2 list-disc pl-5 text-sm leading-6">
                    {event.checklist.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : (
        <p className="text-sm text-ink/70">
          Load the sample or drop a file. You will review inspections before anything is exported.
        </p>
      )}
    </main>
  );
}
