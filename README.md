# InspectAhead

Turn a construction look-ahead into phone-calendar reminders for inspections, readiness walks, and subcontractor report chases.

This is a personal utility, not a Procore replacement.

## The idea, judged honestly

The feature request is: read a project schedule (photo or spreadsheet), find inspection milestones, and generate calendar reminders with readiness checklists. Also remind the superintendent to call subs for reports before the inspector reviews them.

### This already exists in pieces

1. **Construction platforms:** Procore Inspections, Buildertrend Schedule, Autodesk Build, SuperConstruct, Fieldwire. They already schedule inspections and sync Google / Outlook.
2. **Photo to calendar:** Photocalia and similar tools already turn a flyer or timetable photo into an `.ics` file.
3. **Inspection automation:** Tools like InspectPilot already chase city inspection requests in some jurisdictions.

If the team lives in Procore, do not build this. Use the inspections tool they already pay for.

### Where it can still help

1. Small GCs and supers who run a weekly Excel look-ahead and keep calendar on their phone.
2. The prep sequence, not the inspection date. Failed inspections are often a paperwork miss: special inspector reports, test packages, sub not on call.
3. A printed Gantt on the trailer wall that never made it into anyone's calendar.

### Why it can fail

1. Construction dates move. A one-shot `.ics` file is stale within a week. Re-export every look-ahead or people will trust dead dates.
2. Photo OCR of Gantt charts is weak. Bars, tiny fonts, and trailer-wall photos will miss rows. Spreadsheets are the real input. Photos are a convenience with mandatory review.
3. Calendar apps are bad checklists. You cannot check items off inside Google Calendar. The checklist is notes, not a workflow.
4. A missed parse is worse than no tool. That is why nothing is exported until a human reviews the table.

## Best output

`.ics` is the right v1.

- Works in Apple Calendar, Google Calendar, and Outlook.
- No login. Works on a phone in the parking lot.
- Each inspection becomes three events:
  1. `CHASE SUBS` (default 5 business days before)
  2. `READY CHECK` (default 2 business days before)
  3. `INSPECTION` (morning of)

If the weekly habit sticks, the next step is a live calendar feed that refreshes when the look-ahead changes. Not a new SaaS.

## How to use

```bash
npm install
npm test
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

1. Load the sample look-ahead, or drop a `.csv` / `.xlsx`.
2. Review every inspection date. Uncheck junk. Add missed rows.
3. Download the `.ics` file and import it on the superintendent's phone.
4. Do it again next week when the look-ahead changes.

A photo of a schedule is supported via on-device OCR. Fix the extracted text before you export.

## What this does not do

- It does not call the building department.
- It does not sync live with P6 or MS Project.
- It does not track whether a sub actually sent the report.
- It does not replace a failed-inspection log.

## Stack

Next.js App Router, client-side parsing (`xlsx` + `tesseract.js`), Vitest for the schedule and ICS logic.
