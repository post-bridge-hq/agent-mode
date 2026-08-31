# Post Bridge plugin for OpenClaw

Publish and schedule social posts to Instagram, TikTok, YouTube, X, LinkedIn,
Facebook, Pinterest, Threads, Bluesky and Google Business, from inside OpenClaw.

## Install

```bash
openclaw plugins install clawhub:post-bridge
openclaw plugins enable post-bridge
openclaw gateway restart
```

Then add your API key. Create one at
[post-bridge.com/dashboard/api-keys](https://www.post-bridge.com/dashboard/api-keys).

```json5
{
  plugins: {
    entries: {
      "post-bridge": {
        enabled: true,
        config: { apiKey: "pb_live_..." }
      }
    }
  }
}
```

## Tools

| tool | what it does |
|---|---|
| `postbridge_accounts` | List connected accounts with their ids. Call this first. |
| `postbridge_upload_media` | Upload a local image or video, returns a media id. |
| `postbridge_post` | Publish or schedule one post to any subset of accounts. |
| `postbridge_list_posts` | List existing and scheduled posts. |
| `postbridge_results` | Read per-account results for a post. |

Five tools on purpose: the smallest set that covers a real workflow. An agent
choosing from a long list of near-identical tools chooses worse, so analytics,
media listing and post editing are left to `npx postbridge-cli`.

## Notes for anyone building an OpenClaw plugin

Three things the published SDK docs get wrong, each found by building against
OpenClaw's own type definitions and then actually installing the result:

1. `registerTool` takes a SINGLE object, not `({id, inputSchema}, {handler})`.
   Its `parameters` field is a **TypeBox** schema, not JSON Schema.
2. `definePluginEntry` requires `id`, `name` and `description` alongside
   `register`. The docs example passes `register` alone and does not compile.
3. `package.json` must contain `openclaw.extensions` pointing at the built
   entry, for example `["./dist/index.js"]`. This appears nowhere in the SDK
   docs and only surfaces as an install-time error.

## Develop

```bash
npm install
npm run build
openclaw plugins install --link . --force --accept-capabilities
openclaw plugins inspect post-bridge --runtime --json
```

MIT licensed. Source: [post-bridge-hq/agent-mode](https://github.com/post-bridge-hq/agent-mode)
