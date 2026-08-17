---
name: post-bridge
description: >
  Create, schedule, and manage social media posts across Instagram, TikTok, YouTube, X, LinkedIn,
  Facebook, Pinterest, Threads, and Bluesky via the Post Bridge API. Covers media upload, post
  creation, scheduling, platform-specific configs, draft mode, analytics, and post result tracking.
last-updated: 2026-07-28
allowed-tools: Bash(npx postbridge-cli:*), Bash(postbridge-cli:*), Bash(./scripts/post-bridge.js:*)
---

# Post Bridge Social Media Skill

Autonomously manage social media posting via [Post Bridge](https://post-bridge.com) API. Post to 9 platforms from a single command or API call.

The CLI is published on npm as **`postbridge-cli`** — run it with `npx postbridge-cli <command>` (no install needed; npx fetches it on first use). Requires Node.js 18+. If `npx postbridge-cli` is unavailable for any reason, fall back to the bundled script at `<skill-path>/scripts/post-bridge.js` (same commands and flags).

> **Freshness check**: If more than 30 days have passed since the `last-updated` date above, inform the user that this skill may be outdated and point them to the update options below.

## Keeping This Skill Updated

**Source**: [github.com/post-bridge-hq/agent-mode](https://github.com/post-bridge-hq/agent-mode)
**API docs**: [api.post-bridge.com/reference](https://api.post-bridge.com/reference)

Update methods by installation type:

| Installation | How to update |
|--------------|---------------|
| CLI (`npx skills`) | `npx skills update` |
| Claude Code plugin | `/plugin marketplace update` |
| Cursor | Remote rules auto-sync from GitHub |
| Manual | Pull latest from repo or re-copy `skills/post-bridge/` |

## Setup

1. Create a Post Bridge account at [post-bridge.com](https://post-bridge.com)
2. Connect your social accounts (TikTok, Instagram, YouTube, Twitter, etc.)
3. [Enable API access](https://www.post-bridge.com/dashboard/api-keys) (Settings > API)
4. Store your API key in workspace `.env`:
   ```
   POST_BRIDGE_API_KEY=pb_live_xxxxx
   ```

Or run the setup command:
```
npx postbridge-cli setup --key pb_live_xxxxx
```

## Auth

All requests use Bearer token:
```
Authorization: Bearer <POST_BRIDGE_API_KEY>
```

Base URL: `https://api.post-bridge.com`

**Config priority** (highest to lowest):
1. `POST_BRIDGE_API_KEY` environment variable
2. `./.post-bridge/config.json` (project-local)
3. `~/.config/post-bridge/config.json` (user-global)

### Handling "API key not found" errors

When you receive an "API key not found" error from the CLI:

1. **Tell the user to run the setup command** — setup requires user input, so you cannot run it on their behalf:
   ```bash
   npx postbridge-cli setup --key pb_live_xxxxx
   ```
2. **Stop and wait** — do not continue with the task. You cannot create posts or perform any API operations without a valid API key.
3. **DO NOT** search for API keys in env files, keychains, or other locations.

Get your API key at: https://www.post-bridge.com/dashboard/api-keys

> **Note for agents**: Prefer `npx postbridge-cli` (the published npm CLI). If the skill is installed locally and you want to run the bundled copy instead, the script lives at `<skill-path>/scripts/post-bridge.js` — same commands and flags.

## CLI Commands

| Command | Description |
|---------|-------------|
| `npx postbridge-cli setup --key <key>` | Configure API key |
| `npx postbridge-cli accounts` | List connected social accounts |
| `npx postbridge-cli post --caption "..." --accounts 1,2,3` | Create a post |
| `npx postbridge-cli post --caption "..." --accounts 1,2,3 --schedule "2026-06-20T09:00:00Z"` | Schedule a post for a specific time (UTC) |
| `npx postbridge-cli post --caption "..." --accounts 1,2 --use-queue` | Auto-schedule to the next queue slot (saved timezone) |
| `npx postbridge-cli post --caption "..." --accounts 1,2 --use-queue --queue-timezone "America/New_York"` | Auto-schedule to next queue slot in a specific timezone |
| `npx postbridge-cli post --caption "..." --accounts 1,2 --draft` | Save as a draft instead of publishing |
| `npx postbridge-cli post --caption "..." --accounts 1,2 --platform-config '{"tiktok":{"draft":true}}'` | Post with per-platform options |
| `npx postbridge-cli upload --file ./image.jpg` | Upload media, returns media_id |
| `npx postbridge-cli post --caption "..." --accounts 1,2,3 --media mid_xxx` | Post with uploaded media |
| `npx postbridge-cli posts` | List recent posts (filters: `--status`, `--platform`, `--limit`, `--offset`) |
| `npx postbridge-cli posts:get --id <post_id>` | Get post details and status |
| `npx postbridge-cli posts:update --id <post_id> --caption "..."` | Update a scheduled/draft post (caption, schedule, accounts, media, draft) |
| `npx postbridge-cli posts:delete --id <post_id>` | Delete a scheduled/draft post |
| `npx postbridge-cli analytics` | View analytics (filters: `--platform`, `--timeframe 7d\|30d\|90d\|all`) |
| `npx postbridge-cli analytics:sync` | Refresh analytics data (`--platform tiktok\|youtube\|instagram` optional) |
| `npx postbridge-cli results --post-id <post_id>` | Check per-platform posting results |
| `npx postbridge-cli media` | List uploaded media |
| `npx postbridge-cli media:delete --id <media_id>` | Delete uploaded media |

## API Reference

Use these endpoints directly if you prefer raw API calls over the CLI.

### Social Accounts

```
GET /v1/social-accounts
```
Returns array of connected accounts with `id`, `platform`, `username`. Store these IDs — you need them for every post.

### Upload Media

```
POST /v1/media/create-upload-url
Body: { "mime_type": "video/mp4", "size_bytes": <int>, "name": "video.mp4" }
```
Returns `media_id` + `upload_url`. Then:
```
PUT <upload_url>
Content-Type: video/mp4
Body: <binary file>
```

**List media:**
```
GET /v1/media?limit=50&offset=0
```

**Delete media:**
```
DELETE /v1/media/<media_id>
```

### Create Post

```
POST /v1/posts
Body: {
  "caption": "your caption here #hashtags",
  "media": ["<media_id>"],
  "social_accounts": [<account_id_1>, <account_id_2>],
  "scheduled_at": "2026-01-01T14:00:00Z",  // omit for instant post
  "is_draft": false,  // true to save as draft
  "use_queue": true,  // optional, auto-schedule to next queue slot (uses saved timezone)
  "platform_configurations": { ... },  // optional, see below
  "account_configurations": {  // optional, per-account overrides
    "account_configurations": [
      { "account_id": 1, "caption": "override for this account" }
    ]
  }
}
```

**Queue scheduling (`use_queue`):**
- Pass `true` to auto-schedule using the user's saved timezone from their dashboard settings
- Pass `{ "timezone": "America/New_York" }` to override with a specific IANA timezone
- Cannot be used together with `scheduled_at` — pick one or the other
- Timezone priority: explicit timezone > saved profile/workspace timezone > UTC
- Queue slots are scoped to the workspace of the selected social accounts
- The queue schedule is configured by the user in their Post Bridge dashboard
- If `randomize_queue_time` is enabled, the slot time will be offset by up to ±10 minutes for a more natural posting pattern
- Returns an error if no queue schedule is configured or no slots are available in the next 90 days

### List Posts

```
GET /v1/posts?limit=50&offset=0&status=scheduled&platform=instagram
```
Params: `limit`, `offset`, `status` (scheduled/published/failed/draft), `platform`.

### Get Post

```
GET /v1/posts/<post_id>
```
Returns full post details including status: `processing`, `scheduled`, `posted`, `failed`.

### Update Post

```
PATCH /v1/posts/<post_id>
Body: { "caption": "new caption", "scheduled_at": "...", "social_accounts": [...] }
```
Can update caption, schedule, accounts, media, platform configs, or draft status. Only works on scheduled/draft posts.

### Delete Post

```
DELETE /v1/posts/<post_id>
```
Only works on scheduled/draft posts (cannot delete published posts).

### Post Results

```
GET /v1/post-results?post_id=<post_id>&limit=50&offset=0
```
Returns per-platform results showing whether each platform post succeeded or failed, with error details.

### Analytics

**List analytics** — views, likes, comments, shares per post:
```
GET /v1/analytics?platform=tiktok&limit=50&offset=0&timeframe=30d
```
Params:
- `platform` (optional): `tiktok`, `youtube`, `instagram`
- `timeframe` (optional): `7d`, `30d`, `90d`, `all` (default: `all`)
- `limit`, `offset` for pagination

Returns:
```json
{
  "data": [
    {
      "id": "...",
      "post_result_id": "...",
      "platform": "tiktok",
      "platform_post_id": "...",
      "view_count": 4062,
      "like_count": 120,
      "comment_count": 15,
      "share_count": 8,
      "cover_image_url": "https://...",
      "share_url": "https://...",
      "video_description": "...",
      "duration": 30,
      "platform_created_at": "2026-03-01T09:00:00Z",
      "last_synced_at": "2026-03-03T12:00:00Z",
      "match_confidence": "exact"
    }
  ],
  "count": 42,
  "limit": 50,
  "offset": 0
}
```

**Sync analytics** — refresh data from connected platforms:
```
POST /v1/analytics/sync?platform=tiktok
```
Triggers a background sync of analytics data. Supports all tracked platforms: TikTok, YouTube, and Instagram.

Params:
- `platform` (optional): `tiktok`, `youtube`, or `instagram` — sync only one platform. Omit to sync all.

Returns:
```json
{
  "triggered": [
    { "platform": "tiktok", "runId": "run_..." },
    { "platform": "youtube", "runId": "run_..." },
    { "platform": "instagram", "runId": "run_..." }
  ]
}
```

**Get single analytics record:**
```
GET /v1/analytics/<analytics_id>
```

## MCP Integration

Post Bridge has a native MCP (Model Context Protocol) server. If you're using Claude Desktop, ChatGPT, Cursor, or any MCP-compatible client, you can connect directly without this skill.

**Claude Desktop**: One-click connect at [post-bridge.com/mcp](https://post-bridge.com/mcp)

**Claude Code / Cursor / Other MCP clients** — add to your MCP config:
```json
{
  "mcpServers": {
    "post-bridge": {
      "type": "streamable-http",
      "url": "https://mcp.post-bridge.com/mcp"
    }
  }
}
```

**MCP Tools available** (11 tools):

| Tool | Description |
|------|-------------|
| `list_social_accounts` | List all connected accounts with IDs, platforms, usernames |
| `create_post` | Create/schedule a post. Accepts caption, accounts, media_urls, schedule, use_queue (true or {timezone}), platform configs |
| `list_posts` | List posts with filters (platform, status, limit, offset) |
| `get_post` | Get full post details by ID |
| `update_post` | Update caption, schedule, accounts, or media on a scheduled/draft post |
| `delete_post` | Delete a scheduled or draft post |
| `list_analytics` | Get analytics (views, likes, comments, shares) with platform/timeframe filters |
| `sync_analytics` | Trigger a background refresh of analytics data. Optional `platform` param to sync a specific platform (tiktok/youtube/instagram) |
| `list_post_results` | Check per-platform posting results (success/failure with error details) |
| `list_media` | List uploaded media files with IDs and URLs |
| `delete_media` | Delete an uploaded media file |

MCP tools accept `media_urls` (public URLs) — the server downloads and uploads them automatically. No need to manually upload media when using MCP.

## Platform Configurations

Optional per-platform overrides, passed inside the `platform_configurations` object on post creation/update, or via `--platform-config '<json>'` with the CLI. This is the #1 place to get wrong, so read carefully:

**Rules**
1. **Key by platform name.** Every override lives under a platform key: `pinterest`, `instagram`, `tiktok`, `twitter`, `youtube`, `facebook`, `linkedin`, `bluesky`, `threads`, `google_business`. A field placed at the wrong level (or under the wrong platform) is silently ignored.
2. **Only include platforms you're actually posting to.** Don't add a `tiktok` block if no TikTok account is in `social_accounts`.
3. **Only include fields you want to override.** Everything you omit falls back to the top-level `caption` / `media`. `caption` and `media` are accepted under *every* platform key; the other fields are platform-specific and listed below.
4. **Match the accepted values exactly.** Enums (`placement`, `trial_graduation`, `cta_action_type`, `location`, …) only accept the values shown — anything else errors or is dropped.

Every platform accepts:
- `caption` (string) — caption override for that platform only
- `media` (array of media IDs) — media override for that platform only

Platform-specific fields:

| Platform (`key`) | Field | Type / accepted values | What it does |
|---|---|---|---|
| **Pinterest** (`pinterest`) | `board_ids` | array of string IDs | Boards to pin to (IDs, not names). Omit → account default board. |
| | `link` | string (full URL) | Destination URL the pin links to. |
| | `title` | string (≤100 chars) | Pin title shown above the caption. |
| | `video_cover_timestamp_ms` | number (ms) | Video cover frame, e.g. `3000` = 3s in. |
| **Instagram** (`instagram`) | `placement` | `"story"` | Publish as a Story (one image/video, no caption/carousel/cover/trial). Omit → Reel/feed. |
| | `video_cover_timestamp_ms` | number (ms) | Cover frame for a reel/video. Ignored if `cover_image` is set. |
| | `cover_image` | string (media ID) | Uploaded image used as the reel cover. Upload first, pass its ID. |
| | `is_trial_reel` | boolean | Trial reel (non-followers first). Needs Pro/Creator account, 1,000+ followers, public profile. Max 5/day. Not with `placement:"story"`. |
| | `trial_graduation` | `"MANUAL"` \| `"SS_PERFORMANCE"` | Trial reel graduation. `MANUAL` (default) = you decide; `SS_PERFORMANCE` = auto-graduate on performance in 72h. |
| | `user_tags` | array of usernames | People-tag accounts (they get notified). `@` optional. Feed/carousel/reels only; ignored for stories. Max 20. |
| | `collaborators` | array of usernames | Invite co-authors: the post also appears on their profile and shares its likes/comments. `@` optional. **Max 3, public accounts only** — a private or wrong handle fails the post. Feed/carousel/reels only; ignored for stories. Publishes immediately; shows on their profile once they accept. |
| **TikTok** (`tiktok`) | `title` | string | Overrides the post title. |
| | `video_cover_timestamp_ms` | number (ms) | Cover frame, e.g. `3000` = 3s in. |
| | `draft` | boolean | Send as a **native TikTok draft** (finish/publish manually in the app, e.g. to add a trending sound). Different from top-level `is_draft` (which only saves in Post Bridge). |
| | `is_aigc` | boolean | Label as AI-generated content. |
| | `privacy_status` | `"public"` \| `"private"` | `private` publishes visible only to you. Defaults to public. |
| | `auto_add_music` | boolean | **Photo posts only — ignored on videos.** TikTok picks a soundtrack for the carousel. Defaults to true; set `false` to publish silent. |
| | `allow_comment` | boolean | Allow comments. Defaults to true. |
| | `allow_duet` | boolean | Allow Duets. Defaults to true. Video posts only. |
| | `allow_stitch` | boolean | Allow Stitches. Defaults to true. Video posts only. |
| | `disclose_branded_content` | boolean | Disclose as paid partnership / branded content. Defaults to false. |
| | `disclose_your_brand` | boolean | Disclose as promoting your own brand. Defaults to false. |
| **Twitter/X** (`twitter`) | `first_comment` | string (≤280, 2200 premium) | Reply posted right after the tweet. **Put links here** — the main tweet strips URLs to dodge X's surcharge. A failed reply won't fail the post. |
| **YouTube** (`youtube`) | `title` | string (≤100 chars) | Video title override. |
| | `contains_synthetic_media` | boolean | Disclose realistic altered/AI content ("Altered or synthetic content" label). |
| | `thumbnail` | string (media ID) | Custom thumbnail. **Long-form videos only** — ignored on Shorts. Channel must be verified; JPEG/PNG, 1280×720, <2MB. |
| **Facebook** (`facebook`) | `placement` | `"story"` | Publish as a Page Story (one image/video, no caption/carousel). Omit → feed post. |
| **LinkedIn** (`linkedin`) | `document_title` | string | Title for a PDF (document/carousel) post. Only applies when media is a PDF. Defaults to file name. |
| **Bluesky** (`bluesky`) | — | — | Only `caption` / `media` overrides. |
| **Threads** (`threads`) | `location` | `"timeline"` \| `"reels"` | Where it appears. `timeline` (default) or `reels` (video only). |
| **Google Business** (`google_business`) | `media` | array (single image) | **One image only** — extra images are dropped for GMB (other platforms keep all). No video. |
| | `cta_action_type` | `BOOK` \| `ORDER` \| `SHOP` \| `LEARN_MORE` \| `SIGN_UP` \| `CALL` | CTA button. Pair with `cta_url` (except `CALL`, which uses the location phone number). |
| | `cta_url` | string (full URL) | CTA destination. Required when `cta_action_type` is set (except `CALL`). |
| | `language_code` | string (BCP-47) | e.g. `"en-US"`, `"es"`, `"fr-CA"`. Defaults to `"en-US"`. |

**Example — correct multi-platform config (CLI)**

Posting one piece of content to TikTok + Instagram + X + Google Business, with per-platform tweaks:
```
npx postbridge-cli post --caption "New drop is live 🎉" --accounts 44029,44030,44031,44032 \
  --platform-config '{
    "tiktok":   { "draft": true, "is_aigc": false },
    "instagram": { "caption": "New drop is live 🎉 tap the link in bio", "video_cover_timestamp_ms": 2000 },
    "twitter":  { "first_comment": "Grab it here: https://example.com/drop" },
    "google_business": { "cta_action_type": "SHOP", "cta_url": "https://example.com/drop" }
  }'
```
Note how the X link lives in `twitter.first_comment` (not the caption), TikTok uses a native draft, and only the four platforms being posted to appear as keys.

## Platform Gotchas (important for agents)

These behaviors are easy to miss and cause silent or confusing failures. Account for them before posting.

- **Some platforms require media; others accept text-only.** These **fail** a post with no media: `youtube` (exactly 1 video), `tiktok` (1 video, or one+ images for a photo post), `instagram` (1–10 images/videos; a story is exactly 1; PDFs are dropped), `pinterest` (1 image or video). These accept text-only: `twitter`/X (up to 4 images, or 1 video), `facebook`, `linkedin` (up to 20 images, or 1 video, or 1 PDF document), `threads` (up to 20 images/videos), `bluesky` (up to 4 images, or 1 video), `google_business` (text or a single image; no video). A post can be created with no media and have media added later via `posts:update`, but it won't publish to a media-required platform until media exists. When a post targets several platforms, each takes what it supports and skips what it can't (e.g. a video serves YouTube; X uses it too).
- **X (Twitter) strips URLs from captions.** Links (`http://`, `https://`, `www.`) are removed from the X caption before posting. This is intentional (link posts on X cost ~13× more per post). If a link is essential for X, put it in `twitter.first_comment` (links ARE allowed there — it's posted as a reply right after the tweet), not the caption — and tell the user the link won't appear in the X post itself.
- **Media must be uploaded, not pasted as a raw link.** Do not put a Google Drive / Dropbox / arbitrary external URL into `media`. The `media` field takes Post Bridge `media_id`s only. Either `upload` the file first (CLI/API) or use `media_urls` (CLI `--media-urls`, or the MCP `media_urls` field) with a *direct, public* file URL that the server can download. A non-direct share link will fail with a generic error and no per-platform results.
- **Very large videos (~300MB+) can silently drop YouTube, LinkedIn, and X.** Those three platforms buffer the whole file server-side and may time out / OOM on huge uploads, producing *no* result row for them while Instagram/TikTok/Facebook/Threads succeed. If `results` shows fewer platforms than you posted to, suspect file size — re-encode smaller or shorter. Keep videos reasonably sized.
- **Each platform posts independently.** One platform failing does not stop the others. Always check `results --post-id <id>` after a publish to confirm per-platform success and read any error details.
- **TikTok / Instagram caption + sound limits differ.** Keep captions concise; for trending-sound workflows use TikTok `draft: true` so the user can add the sound and publish manually.

## Recommended Workflow for Video Content

1. Store videos in a local folder
2. Extract a frame with ffmpeg to read any text overlays:
   ```
   ffmpeg -i video.mp4 -ss 00:00:04 -frames:v 1 frame.jpg -y
   ```
3. Write caption based on video content + hashtags
4. Upload → create post → schedule or post instantly
5. Move posted videos to a `posted/` subfolder to avoid duplicates
6. Set a cron to check post status 5 mins after scheduled time
7. Track performance by checking post results or analytics

## Automation Guidelines

When automating posts, follow these rules to keep accounts in good standing:

- **No duplicate content** across multiple accounts on the same platform
- **No unsolicited automated replies** — only post original content or when explicitly requested
- **No trending manipulation** — don't mass-post about trending topics across accounts
- **No fake engagement** — don't automate likes, follows, or comments
- **Respect rate limits** — the API has rate limits, don't spam requests
- **Use draft mode for review** — when in doubt, use `is_draft: true` or TikTok's `draft: true` so the user can review before publishing

**Publishing confirmation**: Unless the user explicitly asks to "post now" or "publish immediately", always confirm before posting. Creating a draft is safe; posting is irreversible and goes live instantly.

## Platform Names

Use these exact names for platform filtering and configurations:
- `instagram` — Instagram (Reels, Stories, Feed)
- `tiktok` — TikTok
- `youtube` — YouTube (Shorts)
- `twitter` — X (formerly Twitter)
- `linkedin` — LinkedIn
- `facebook` — Facebook
- `pinterest` — Pinterest
- `threads` — Threads
- `bluesky` — Bluesky

## Tips

- Post to multiple platforms simultaneously by including multiple account IDs
- Stagger posts throughout the day (e.g. 9am + 3pm) for better reach
- Use `scheduled_at` to pre-schedule batches — Post Bridge handles the timing
- Use `use_queue: true` to auto-schedule posts to the user's next available queue slot using their saved timezone — no need to pick a time manually
- TikTok draft mode lets you add trending sounds manually before publishing
- Keep hashtags to 4-5 per post for best engagement
- Check `results` after posting to see per-platform success/failure
- Use `analytics:sync` to refresh data before checking analytics
- Monitor what works and iterate on captions/formats
- Use `--draft` flag when testing to avoid accidental publishing
- Character limits vary by platform — keep captions concise for X (280 chars)
