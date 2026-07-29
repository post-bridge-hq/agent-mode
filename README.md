# Post Bridge Agent Mode

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.1.0-green.svg)]()
[![npm](https://img.shields.io/badge/npm-postbridge-cli-CB3837)](https://www.npmjs.com/package/postbridge-cli)
[![Post Bridge API](https://img.shields.io/badge/Post_Bridge-API-3B9AF8)](https://api.post-bridge.com/reference)

Give your AI agent the ability to post to 9 social media platforms from a single command.

**Supports:** Instagram, TikTok, YouTube, X (Twitter), LinkedIn, Facebook, Pinterest, Threads, Bluesky

Built on the [Post Bridge API](https://api.post-bridge.com/reference). [Post Bridge](https://www.post-bridge.com) is a social media scheduling tool used by 1,500+ creators and teams to post everywhere from one place.

## What Are Skills?

Skills are markdown files that give AI agents specialized knowledge and workflows for specific tasks. Add this to your project and your AI agent will be able to create, schedule, and publish social media content across 9 platforms.

## Install

### Skill (works with Claude Code, Cursor, Windsurf, Codex, and other agents):

```bash
npx skills add post-bridge-hq/agent-mode
```

This installs the skill **and** makes the `postbridge-cli` CLI available to your agent.

### CLI only (no skill, any terminal):

The CLI is published standalone on npm — no install required, `npx` fetches it on first use:

```bash
npx postbridge-cli setup --key pb_live_xxxxx
npx postbridge-cli accounts
```

Requires Node.js 18+. Install globally with `npm i -g postbridge-cli` if you'd rather drop the `npx` prefix.

<details>
<summary>Other installation methods</summary>

**Claude Code Plugin:**

Add the marketplace and install:

```
/plugin marketplace add post-bridge-hq/agent-mode
/plugin install post-bridge@post-bridge
```

Or load locally for development:

```bash
claude --plugin-dir ./agent-mode
```

**Cursor:**

1. Open Settings (Cmd+Shift+J)
2. Go to "Rules & Command" > "Project Rules"
3. Click "Add Rule" > "Remote Rule (GitHub)"
4. Enter: `https://github.com/post-bridge-hq/agent-mode.git`

**Manual:**

Clone this repository and copy `skills/post-bridge/` to your project's `.cursor/skills/` or `.claude/skills/` directory.

</details>

## Setup

1. Sign up at [post-bridge.com](https://www.post-bridge.com) and connect your social accounts
2. [Enable API access](https://www.post-bridge.com/dashboard/api-keys) (Settings > API) — $5/month add-on
3. Run the setup command:

```bash
npx postbridge-cli setup --key pb_live_xxxxx
```

> **Tip:** You can also set the API key as an environment variable instead of running `setup`: `export POST_BRIDGE_API_KEY=pb_live_xxxxx` (add it to `~/.zshrc` / `~/.bashrc` to persist).

### Start using it

Ask your AI agent things like:

- "Post this to all my social accounts"
- "Schedule a post for tomorrow at 9am on Instagram and TikTok"
- "Upload this video and post it everywhere"
- "How did yesterday's post perform?"
- "Show my scheduled posts"
- "Delete the draft I made earlier"

## What your agent can do

- **Post** to any or all 9 connected platforms in one command
- **Schedule** posts for any date/time
- **Upload** images and videos (automatic format conversion)
- **Check analytics** — views, likes, comments, shares across TikTok, YouTube, Instagram
- **Manage accounts** — list connections, check status
- **Per-platform overrides** — custom captions, TikTok draft mode, YouTube titles, Instagram trial reels, Pinterest boards, etc.

## Quick start

```bash
# List your connected accounts
npx postbridge-cli accounts

# Post to specific accounts
npx postbridge-cli post --caption "Hello world!" --accounts 1,2,3

# Schedule a post (specific UTC time)
npx postbridge-cli post --caption "Morning post" --accounts 1,2 --schedule "2026-06-20T14:00:00Z"

# Or auto-schedule to your next queue slot
npx postbridge-cli post --caption "Morning post" --accounts 1,2 --use-queue

# Upload media and post with it
npx postbridge-cli upload --file ./video.mp4
npx postbridge-cli post --caption "Check this out" --accounts 1,2,3 --media mid_xxx

# Check analytics
npx postbridge-cli analytics
```

## Supported Platforms

- Instagram (Reels, Stories, Feed)
- TikTok
- YouTube (Shorts)
- X (formerly Twitter)
- LinkedIn
- Facebook
- Pinterest
- Threads
- Bluesky

### Media requirements

Some platforms can't publish a text-only post and will fail without an image or video:

| Platform | Media | Accepts |
|----------|-------|---------|
| YouTube | Required | exactly 1 video |
| TikTok | Required | 1 video, or one+ images (photo post) |
| Instagram | Required | 1–10 images/videos; story = exactly 1; no PDFs |
| Pinterest | Required | 1 image or video |
| X (Twitter) | Optional | up to 4 images, or 1 video |
| Facebook | Optional | 1 video, or one+ images |
| LinkedIn | Optional | up to 20 images, or 1 video, or 1 PDF |
| Threads | Optional | up to 4 images/videos |
| Bluesky | Optional | up to 4 images, or 1 video |
| Google Business | Optional | text or a single image; no video |

You can create a post without media and add it later with `posts:update` — but it won't publish to a media-required platform until the media exists.

## Troubleshooting

### "API key not found"

Run the setup command:

```bash
npx postbridge-cli setup --key pb_live_xxxxx
```

Or set the environment variable manually:

```bash
export POST_BRIDGE_API_KEY=pb_live_xxxxx
```

To persist across sessions, add it to your shell profile (`~/.bashrc`, `~/.zshrc`, etc.).

### "Node.js is required"

The CLI is a zero-dependency Node.js script and requires Node.js 18+ (for built-in `fetch`). Install a recent Node.js version, then retry.

### API errors (401, 403)

- Verify your API key is correct
- Check that API access is enabled at [post-bridge.com/dashboard/api-keys](https://www.post-bridge.com/dashboard/api-keys)
- Make sure you have an active subscription with the API add-on ($5/month)

### Post failed on one platform

Each platform posts independently. If one fails, the others still go through. Use `npx postbridge-cli results --post-id <id>` to see per-platform status and error details.

## MCP Server

Post Bridge also runs a hosted **MCP server**, so MCP-compatible clients (Claude, ChatGPT, Cursor, and other agents) can connect directly — no CLI, no install.

- **Endpoint:** `https://www.post-bridge.com/api/mcp/mcp` (streamable HTTP)
- **Auth:** OAuth 2.0 — connect and sign in, no API key needed. (Or pass a `pb_live_...` key as a Bearer token, see below.)

### Connect

**Claude or ChatGPT (one-click, OAuth):** add a custom connector / app using the endpoint URL above, sign in to Post Bridge, and authorize. Leave any OAuth client ID/secret blank — the server registers the client automatically.

**Claude Desktop (via `mcp-remote`)** — add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "post-bridge": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://www.post-bridge.com/api/mcp/mcp",
        "--header",
        "Authorization: Bearer pb_live_your_api_key_here"
      ]
    }
  }
}
```

**Claude Code / other HTTP MCP clients** — add to `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "post-bridge": {
      "type": "http",
      "url": "https://www.post-bridge.com/api/mcp/mcp",
      "headers": { "Authorization": "Bearer pb_live_your_api_key_here" }
    }
  }
}
```

### Tools (13)

`list_social_accounts`, `create_post`, `update_post`, `get_post`, `list_posts`, `delete_post`, `list_post_results`, `upload_media`, `list_media`, `delete_media`, `list_analytics`, `get_analytics_daily`, `sync_analytics`

### Try it

- "Which social accounts do I have connected?"
- "Schedule this video to TikTok, Instagram Reels and YouTube Shorts for tomorrow at 9am."
- "Which of my posts got the most views in the last 30 days?"

Full setup guide and tool reference: [post-bridge.com/mcp/docs](https://www.post-bridge.com/mcp/docs)

## Links

- [Post Bridge](https://www.post-bridge.com)
- [Agent Mode Landing Page](https://www.post-bridge.com/agents)
- [API Documentation](https://api.post-bridge.com/reference)
- [MCP Setup](https://www.post-bridge.com/mcp)

## License

MIT
