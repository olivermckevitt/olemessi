# olemessi

Jobsite note classifier for a retail construction superintendent.

Click the desktop icon, dictate with Wispr Flow into the “What happened on site?” box, then file. It categorizes the note and saves it to Notion.

One dictation becomes one active Notion row. Long-term insights are copied to Lessons Learned. No photos. No search.

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

### 3. Desktop capture

Live page:

`https://superb-halva-c3d71d.netlify.app/`

1. Open that page.
2. Paste `CLASSIFY_SECRET` once. It stays on that computer.
3. Mac: File → Add to Dock. Windows: pin the tab or drag the URL to the desktop.
4. Click the icon. The “What happened on site?” box is focused.
5. Hold the Wispr Flow hotkey and talk. Default Mac hotkey is `fn`. Default Windows hotkey is `Ctrl+Win`.
6. Click **File note**. Autosave. Notion opens the new row.

Wispr Flow cannot be started by the page. The box has to be focused, then you hold the Flow hotkey.

### 4. Optional Mac popup Shortcut

If you want the old Ask for Text popup instead of the page:

1. New Shortcut named **File jobsite note**
2. **Ask for Text** `What happened on site?`
3. **Get Contents of URL**
   - URL: `https://superb-halva-c3d71d.netlify.app/api/classify`
   - Method: POST
   - Headers: key typed as `X-Classify-Secret`
   - Request Body: JSON
     - `text` = Provided Input
     - `project` = `Store 1184`
4. **Get Dictionary from Input**
5. **Get Dictionary Value** `category` → Show Notification
6. **Get Dictionary Value** `url` → Open URLs
7. File → Add to Dock

Hold Flow in that text box, then tap OK.

## API

`POST /api/classify`

JSON:

```json
{
  "text": "paint delivery at 7am at the dock",
  "project": "Store 1184"
}
```

Response:

```json
{
  "category": "Daily Log / Site Progress",
  "title": "Paint delivery at dock",
  "location": "Dock",
  "subcontractor_or_trade": null,
  "urgency": "medium",
  "daily_log_summary": "Paint delivery is at 7am at the dock.",
  "route": { "kanban": true, "knowledge_base": false },
  "red_flag": false,
  "alert_status": null,
  "skill_assessment": null,
  "url": "https://www.notion.so/...",
  "folder": "Logistics and Deliveries"
}
```

`folder` is one of the 10 folders. `category` is one of the 4 Kanban types.

## Local tests

```
npm install
npm test
```
