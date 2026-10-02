# olemessi

Jobsite tools for a retail construction superintendent.

Whisper Flow text, plus an optional photo from the Shortcut, posts here. This classifies the note, saves it to Notion, and returns JSON.

One dictation becomes one active Notion row. Long-term insights are copied to Lessons Learned.

This repo also has a drawing wiki and InspectAhead, a look-ahead to inspection calendar tool.

## Folders

Still the original 10:

- Contacts
- Lessons Learned
- Daily Logs
- Subcontractor Deficiencies and Punch List
- Logistics and Deliveries
- RFIs and Field Clarifications
- Safety and Inspections
- Change Orders
- to-do list
- General Notes

Kanban types sit on top of the folder:

- Daily Log / Site Progress
- Subcontractor Deficiency / Punch List
- RFI / Site Clarification
- Safety Issues and Inspections

Primary intent only. Wrong folder: change it in Notion.

Contacts also extract phone and email when they are in the transcript. To-dos are a normal note. No checkbox.

Photo is optional. Text-only still works. If you send a photo, it is analyzed with the transcript and attached to the Notion page. JPEG, PNG, WebP, or GIF. Max 4 MB. Convert iPhone HEIC to JPEG in the Shortcut.

## Notion

Private databases:

- Active Kanban: [Jobsite Field Notes](https://www.notion.so/7220342e572d4484af6148271cc87164)
- Knowledge base: [Jobsite Lessons Learned](https://www.notion.so/491eeab2dd974f1eb6a9a9eafdb08a8d)

Both are private drafts. Say where they should live if you want them moved.

Active board views: **Kanban** (by Status, hides Logged) and **By type** (by Kanban Type).

New active items with `route.kanban = true` land in **To Do**. Notes that are not kanban work land as **Logged** and stay off the board.

`route.knowledge_base = true` copies the same note into Jobsite Lessons Learned, with a Source link back to the active row.

Red flags stay off until you connect a Retail Construction Skill Base page. I will not invent codes.

## One-time setup

### 1. Notion integration

1. Open [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Create an internal integration
3. Copy the token
4. Connect it to **Jobsite Field Notes** and **Jobsite Lessons Learned**
5. When you have a skill base page, connect that page too

### 2. Netlify

1. Create or link a Netlify site on this repo
2. Enable AI on the site
3. Deploy to production once. The AI Gateway does not work until that first production deploy.
4. Set environment variables:

```
CLASSIFY_SECRET=<long random string>
NOTION_TOKEN=<integration token>
NOTION_DATABASE_ID=7220342e572d4484af6148271cc87164
NOTION_LESSONS_DATABASE_ID=491eeab2dd974f1eb6a9a9eafdb08a8d
NOTION_SKILL_BASE_PAGE_ID=<optional, from the skill base page URL>
```

Do not set `OPENAI_API_KEY`. Netlify injects the gateway key.

Paste or link the skill base and I will wire `NOTION_SKILL_BASE_PAGE_ID`. Until then, `red_flag` is always false.

### 3. Apple Shortcut

The live URL is:

`https://superb-halva-c3d71d.netlify.app/api/classify`

Not `/.netlify/functions/classify`. Open that URL in Safari. You should see `{"ok":true,"post":"/api/classify"}`. If Safari says Not Found, Netlify is still deploying `main`. Set the production branch to this PR branch, or merge the PR, then redeploy.

Name: **File jobsite note**

1. New Shortcut
2. Add **Receive** → Text, from Share Sheet
3. If input is empty, **Get Clipboard** → Set variable `Transcript`
4. Optional photo: **Select Photos** → **Convert Image** JPEG → Set variable `Photo`
5. Add **Get Contents of URL**
   - URL: `https://superb-halva-c3d71d.netlify.app/api/classify` as plain text. No markdown.
   - Method: POST
   - Headers: key must be exactly `X-Classify-Secret`
   - Request Body: Form
     - `text` = `Transcript`
     - `project` = `Store 1184`
     - `image` = `Photo` as a File. Not `photo`.
6. **Get Dictionary from Input** using Contents of URL
7. **Get Dictionary Value** `category` → Show Notification
8. **Get Dictionary Value** `url` → Open URLs

If the header keeps getting truncated, add a Form field `secret` with the same value as `CLASSIFY_SECRET`.

Text-only JSON still works if you skip the photo:

```json
{
  "text": "paint delivery at 7am at the dock",
  "project": "Store 1184"
}
```

Autosave. You do not confirm the folder first.

## API

`POST /api/classify`

Form fields: `text`, `project` (optional), `image` (optional file).

Or JSON:

```json
{
  "text": "open shaft at grid B, no rail",
  "project": "Store 1184",
  "image_base64": "<optional>",
  "image_mime": "image/jpeg"
}
```

Response:

```json
{
  "category": "Safety Issues and Inspections",
  "title": "Open shaft no rail",
  "location": "Grid B stair",
  "subcontractor_or_trade": "Framing",
  "urgency": "critical",
  "daily_log_summary": "Photo confirms the stair shaft has no guardrail.",
  "route": { "kanban": true, "knowledge_base": false },
  "red_flag": false,
  "alert_status": null,
  "skill_assessment": null,
  "url": "https://www.notion.so/...",
  "folder": "Safety and Inspections"
}
```

`folder` is one of the 10 folders. `category` is one of the 4 Kanban types.

## Drawing wiki

Index PDFs and DXF once. Query `wiki/drawings.sqlite` after that. Do not send the drawings back to a model.

```
npm run index-drawings -- --input ./plans --output ./wiki
npm run query-drawings -- --db ./wiki/drawings.sqlite door width grid B
```

`--ai` is optional leftover-note extraction. `--vision` is optional cropped raster fallback for low-confidence lengths only. Skip both unless you need them. DWG is not parsed. Convert to DXF first.

`drawings.md` is the master map. Sanity checks and schedule macros drop or flag junk before it hits sqlite. Conflicts stay in `wiki/_conflicts.md`. Newest revision wins.

## InspectAhead

Turn a construction look-ahead into phone-calendar reminders for inspections, readiness walks, and subcontractor report chases.

This is a personal utility, not a Procore replacement. Spreadsheets are the real input. Photos need OCR review. Re-export the calendar when the look-ahead changes.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

1. Load the sample look-ahead, or drop a `.csv` / `.xlsx`.
2. Review every inspection date. Uncheck junk. Add missed rows.
3. Download the `.ics` file and import it on the superintendent's phone.
4. Do it again next week when the look-ahead changes.

Each inspection becomes three events:

1. `CHASE SUBS` (default 5 business days before)
2. `READY CHECK` (default 2 business days before)
3. `INSPECTION` (morning of)

If the schedule lists City or AHJ as the trade, chase reminders call the responsible sub, not the inspector.

## Local tests

```
npm install
npm test
```
