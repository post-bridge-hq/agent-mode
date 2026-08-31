import { readFile, stat as statFile } from "node:fs/promises";
import { basename, extname, resolve as resolvePath } from "node:path";
import { Type } from "@sinclair/typebox";
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { jsonResult } from "openclaw/plugin-sdk/tool-results";

// Post Bridge plugin for OpenClaw.
//
// Five tools. Kept deliberately small (an agent picking from a long list of
// near-identical tools picks worse), but NOT smaller than a working workflow:
// without upload_media there is no way to create a media id, so posting a local
// file would be impossible and the plugin would only work for content already
// hosted at a public URL. Analytics, media listing and post editing stay out;
// they are reachable via `npx postbridge-cli`.
//
// TWO THINGS THE PUBLISHED DOCS GET WRONG, both caught by typechecking against
// openclaw's own .d.ts rather than trusting the examples:
//
// 1. registerTool is a SINGLE object, not registerTool({id, inputSchema},
//    {handler}). Fields are `name`, `label`, `description`, `parameters`
//    (TypeBox, NOT JSON Schema) and `execute(toolCallId, params, signal,
//    onUpdate, ctx)`.
// 2. definePluginEntry requires `id`, `name` and `description` alongside
//    `register`. The docs example passes `register` alone and does not compile.

const DEFAULT_BASE_URL = "https://api.post-bridge.com";

type PluginConfig = { apiKey?: string; baseUrl?: string };

function readConfig(api: any): PluginConfig {
  return (api?.config?.plugins?.entries?.["post-bridge"]?.config ?? {}) as PluginConfig;
}

async function callApi(
  cfg: PluginConfig,
  method: "GET" | "POST",
  path: string,
  body?: unknown,
  signal?: AbortSignal
) {
  if (!cfg.apiKey) {
    throw new Error(
      "No Post Bridge API key configured. Set plugins.entries.post-bridge.config.apiKey — create a key at https://www.post-bridge.com/dashboard/api-keys"
    );
  }
  const res = await fetch(`${cfg.baseUrl || DEFAULT_BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${cfg.apiKey}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    signal,
  });
  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }
  if (!res.ok) {
    // Surface the platform's own message. Post Bridge reports per account, so a
    // partial failure is normal and must not read as a total failure.
    throw new Error(
      `Post Bridge API ${res.status}: ${typeof parsed === "string" ? parsed : JSON.stringify(parsed)}`
    );
  }
  return parsed;
}

const MIME_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".avi": "video/x-msvideo",
  ".webm": "video/webm",
};

// Two-step upload, mirroring postbridge-cli: ask for a presigned URL, then PUT
// the bytes straight to storage. The bytes never go through the API host.
async function uploadLocalFile(cfg: PluginConfig, filePath: string, signal?: AbortSignal) {
  const file = resolvePath(filePath);
  const info = await statFile(file).catch(() => null);
  if (!info?.isFile()) throw new Error(`File not found: ${file}`);

  const mimeType = MIME_BY_EXT[extname(file).toLowerCase()] || "application/octet-stream";

  const created: any = await callApi(cfg, "POST", "/v1/media/create-upload-url", {
    mime_type: mimeType,
    size_bytes: info.size,
    name: basename(file),
  }, signal);

  const put = await fetch(created.upload_url, {
    method: "PUT",
    headers: { "Content-Type": mimeType },
    body: await readFile(file),
    signal,
  });
  if (!put.ok) throw new Error(`Media upload failed (${put.status})`);

  return { media_id: created.media_id, mime_type: mimeType, name: basename(file) };
}

export default definePluginEntry({
  id: "post-bridge",
  name: "Post Bridge",
  description:
    "Publish and schedule to Instagram, TikTok, YouTube, X, LinkedIn, Facebook, Pinterest, Threads, Bluesky and Google Business.",
  register(api: any) {
    api.registerTool({
      name: "postbridge_accounts",
      label: "Post Bridge: list accounts",
      description:
        "List the social accounts connected to Post Bridge, with their ids and platforms. Call this before posting: postbridge_post needs account ids, never usernames.",
      promptSnippet:
        "postbridge_accounts - list connected social accounts and their ids",
      parameters: Type.Object({}),
      async execute(_toolCallId: string, _params: unknown, signal?: AbortSignal) {
        const data = await callApi(readConfig(api), "GET", "/v1/social-accounts", undefined, signal);
        return jsonResult(data);
      },
    });

    api.registerTool({
      name: "postbridge_post",
      label: "Post Bridge: publish or schedule",
      description:
        "Publish or schedule one post to any subset of connected social accounts. Media must already be uploaded (media ids) or reachable by URL (media_urls). Omit scheduled_at to publish immediately. Every account publishes independently, so a failure on one does not stop the others.",
      promptSnippet:
        "postbridge_post - publish or schedule a post to chosen social accounts",
      promptGuidelines: [
        "Always call postbridge_accounts first to resolve account ids.",
        "When posting the same content to several accounts on ONE platform, vary the caption per account: identical text across many accounts is what spam classifiers look for.",
        "Prefer scheduling over publishing everything at once. Bunching many posts onto one account in a short window is the most common cause of a platform restriction.",
      ],
      parameters: Type.Object({
        caption: Type.String({ description: "The post caption." }),
        social_accounts: Type.Array(Type.Number(), {
          description: "Account ids from postbridge_accounts.",
          minItems: 1,
        }),
        media: Type.Optional(
          Type.Array(Type.String(), {
            description: "Media ids already uploaded to Post Bridge.",
          })
        ),
        media_urls: Type.Optional(
          Type.Array(Type.String(), {
            description: "Publicly reachable media URLs, used instead of uploaded media ids.",
          })
        ),
        scheduled_at: Type.Optional(
          Type.String({
            description: "ISO 8601 timestamp. Omit to publish immediately.",
          })
        ),
      }),
      async execute(_toolCallId: string, params: any, signal?: AbortSignal) {
        const body: Record<string, unknown> = {
          caption: params.caption,
          social_accounts: params.social_accounts,
        };
        if (params.media?.length) body.media = params.media;
        if (params.media_urls?.length) body.media_urls = params.media_urls;
        if (params.scheduled_at) body.scheduled_at = params.scheduled_at;
        const data = await callApi(readConfig(api), "POST", "/v1/posts", body, signal);
        return jsonResult(data);
      },
    });

    api.registerTool({
      name: "postbridge_results",
      label: "Post Bridge: per-account results",
      description:
        "Read per-account publishing results. Each connected account reports separately, so read this per account rather than treating a post as one pass/fail. A platform restriction (for example a TikTok spam limit) is the platform's decision about that account and is not a fixable error; a dead token or rejected media is.",
      promptSnippet:
        "postbridge_results - read per-account results for a post",
      parameters: Type.Object({
        post_id: Type.Optional(
          Type.String({ description: "Limit results to one post. Omit for recent results." })
        ),
      }),
      async execute(_toolCallId: string, params: any, signal?: AbortSignal) {
        const q = params?.post_id ? `?post_id=${encodeURIComponent(params.post_id)}` : "";
        const data = await callApi(readConfig(api), "GET", `/v1/post-results${q}`, undefined, signal);
        return jsonResult(data);
      },
    });

    api.registerTool({
      name: "postbridge_upload_media",
      label: "Post Bridge: upload media",
      description:
        "Upload a local image or video to Post Bridge and get back a media id to pass to postbridge_post. Use this for any file on disk. Content already hosted at a public URL can skip this and go straight into postbridge_post as media_urls.",
      promptSnippet:
        "postbridge_upload_media - upload a local image or video, returns a media id",
      parameters: Type.Object({
        file_path: Type.String({
          description: "Absolute or relative path to the image or video on disk.",
        }),
      }),
      async execute(_toolCallId: string, params: any, signal?: AbortSignal) {
        const data = await uploadLocalFile(readConfig(api), params.file_path, signal);
        return jsonResult(data);
      },
    });

    api.registerTool({
      name: "postbridge_list_posts",
      label: "Post Bridge: list posts",
      description:
        "List posts already created in Post Bridge, including scheduled ones. Use this to see what is queued before adding more, which is how you avoid stacking several posts onto one account in a short window.",
      promptSnippet: "postbridge_list_posts - list existing and scheduled posts",
      parameters: Type.Object({}),
      async execute(_toolCallId: string, _params: unknown, signal?: AbortSignal) {
        const data = await callApi(readConfig(api), "GET", "/v1/posts", undefined, signal);
        return jsonResult(data);
      },
    });
  },
});
