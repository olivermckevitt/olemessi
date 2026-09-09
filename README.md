# olemessi

Jobsite note classifier for a retail construction superintendent.

Whisper Flow text goes to an Apple Shortcut. The Shortcut posts it here. This classifies the note into one folder, saves it to Notion, and returns the folder name.

No website. No dashboard. No search. One dictation becomes one Notion row.

## Folders

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

Primary intent only. If a note covers two things, it files under one folder. Wrong folder: change it in Notion.

Contacts also extract phone and email when they are in the transcript. To-dos are a normal note. No checkbox.

## Notion

Private database: [Jobsite Field Notes](https://www.notion.so/7220342e572d4484af6148271cc87164)

Properties: Name, Category, Project, Captured, Phone, Email. Transcript is the page body.

Move this database wherever you want. Tell me the destination if you want it moved.

## One-time setup

### 1. Notion integration

1. Open [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Create an internal integration
3. Copy the token
4. Open Jobsite Field Notes → `...` → Connections → add that integration

### 2. Netlify

1. Create or link a Netlify site on this repo
2. Enable AI on the site (Project configuration → AI)
3. Deploy to production once. The AI Gateway does not work until that first production deploy.
4. Set environment variables:

```
CLASSIFY_SECRET=<long random string>
NOTION_TOKEN=<integration token>
NOTION_DATABASE_ID=7220342e572d4484af6148271cc87164
```

Do not set `OPENAI_API_KEY`. Netlify injects the gateway key.

### 3. Apple Shortcut

Name: **File jobsite note**

1. New Shortcut
2. Add **Receive** → Text, from Share Sheet
3. If input is empty, **Get Clipboard**
4. Add **Get Contents of URL**
   - URL: `https://<your-site>.netlify.app/api/classify`
   - Method: POST
   - Headers:
     - `Content-Type`: `application/json`
     - `X-Classify-Secret`: the same value as `CLASSIFY_SECRET`
   - Request Body: JSON
     - `text`: Shortcut Input
     - `project`: your job name, for example `Store 1184` (optional, but this is how notes stay on the right project)
5. Add **Get Dictionary Value** `folder` from the response
6. Add **Show Notification** with that folder
7. Add **Get Dictionary Value** `url`
8. Add **Open URLs**

In Whisper Flow, share the transcript to this Shortcut. It autosaves. You do not confirm the folder first.

## API

`POST /api/classify`

```json
{
  "text": "paint delivery at 7am at the dock",
  "project": "Store 1184"
}
```

`project` is optional.

Response:

```json
{
  "folder": "Logistics and Deliveries",
  "title": "Paint delivery 7am",
  "url": "https://www.notion.so/..."
}
```

## Local tests

```
npm install
npm test
```
