# Character generation tools

There is no Cursor skill that dumps unlimited free colouring-book art. ChatGPT already proved the cap. Use one of these.

## Already in this Cursor chat (no install)

Ask the agent to generate Kody options. It can use the built-in image tool and the reference photo. That is how `references/options/` was made. Free inside the agent run. Not a thing you download.

## Connector to add (closest to "download a tool")

Add a Gemini image MCP. Free Google AI Studio key. Best option if you want to keep generating from Cursor on your laptop.

1. Get a key: [Google AI Studio](https://aistudio.google.com/apikey)
2. Cursor Settings → MCP → add a new server
3. Use this config (project `.cursor/mcp.json` or user `~/.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "mcp-image": {
      "command": "npx",
      "args": ["-y", "mcp-image"],
      "env": {
        "GEMINI_API_KEY": "YOUR_KEY_HERE",
        "IMAGE_OUTPUT_DIR": "./kody-the-carpenter/references/options"
      }
    }
  }
}
```

Package: [shinpr/mcp-image](https://github.com/shinpr/mcp-image)

Then tell Cursor: "Generate 4 colouring-book variants of Kody using the reference image."

**Honest limit:** Google's free image quota moves. The experimental model is the one that is actually free. Nano Banana / paid Gemini image models will bill. If a generate call asks for a card, stop and use the Gemini app instead.

Do not install Ideogram or OpenAI image MCPs for this. They need paid API keys. You already hit ChatGPT's free image cap.

## Free, no Cursor (fastest for several looks)

Use these in a browser. Attach `kody-character-locked.png` every time. Paste the locked prompt from `PROMPT-KIT.md`.

1. [Gemini](https://gemini.google.com) — best free image-to-image right now. Google account. Ask for "colouring book line art, black outline, white fill, no grey."
2. [Microsoft Designer](https://designer.microsoft.com) / Bing Image Creator — daily free boosts. Weaker at keeping the same kid.
3. Hugging Face Spaces running FLUX or SDXL — free queues, slower, more drift.

Skip Leonardo/Ideogram free tiers unless you want watermarks and a second account.

## What not to bother with

- Netlify AI Gateway image gen. That is for a website, not for iterating a character in chat. Needs a production deploy.
- Vercel AI Gateway. Same story, not a downloadable character designer.
- Training a LoRA. Overkill for a 22-page kids book.

## How to run variants so they stay useful

Generate **poses and hair**, not new clothes. Lock:

- hard hat on
- t-shirt, not overalls
- tool belt
- chunky boots
- black line, white fill

Ask for 4 at a time, max. Pick one. Then only generate that one in new poses. If you keep mixing "styles," you will never have one Kody.
