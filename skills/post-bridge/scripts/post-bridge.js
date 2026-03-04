#!/usr/bin/env node

/**
 * Post Bridge Agent Skill CLI
 * A zero-dependency Node.js script for managing social media via Post Bridge API.
 *
 * MIT Licensed — https://github.com/jackfriks/agent-skills
 */

const fs = require("fs");
const path = require("path");
const os = require("os");

const API_BASE = "https://api.post-bridge.com";
const CONFIG_DIR = path.join(os.homedir(), ".config", "post-bridge");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");
const LOCAL_CONFIG = path.join(process.cwd(), ".post-bridge", "config.json");

// ── Config ──────────────────────────────────────────────────────────────────

function getApiKey() {
  // 1. Environment variable
  if (process.env.POST_BRIDGE_API_KEY) return process.env.POST_BRIDGE_API_KEY;
  // 2. Local project config
  if (fs.existsSync(LOCAL_CONFIG)) {
    try {
      return JSON.parse(fs.readFileSync(LOCAL_CONFIG, "utf8")).apiKey;
    } catch {}
  }
  // 3. Global config
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8")).apiKey;
    } catch {}
  }
  return null;
}

function saveApiKey(key, global = true) {
  const dir = global ? CONFIG_DIR : path.join(process.cwd(), ".post-bridge");
  const file = global ? CONFIG_FILE : LOCAL_CONFIG;
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, JSON.stringify({ apiKey: key }, null, 2));
}

// ── HTTP ────────────────────────────────────────────────────────────────────

async function request(method, endpoint, body = null) {
  const apiKey = getApiKey();
  if (!apiKey) {
    error("No API key found. Run: ./scripts/post-bridge.js setup");
    process.exit(1);
  }

  const url = `${API_BASE}${endpoint}`;
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(url, options);
  const text = await res.text();

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    error(`API error (${res.status}): ${JSON.stringify(data)}`);
    process.exit(1);
  }

  return data;
}

async function uploadFile(filePath) {
  const apiKey = getApiKey();
  if (!apiKey) {
    error("No API key found. Run: ./scripts/post-bridge.js setup");
    process.exit(1);
  }

  const file = path.resolve(filePath);
  if (!fs.existsSync(file)) {
    error(`File not found: ${file}`);
    process.exit(1);
  }

  const stat = fs.statSync(file);
  const ext = path.extname(file).toLowerCase();
  const mimeMap = {
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

  const mimeType = mimeMap[ext] || "application/octet-stream";

  // Step 1: Get upload URL
  const createRes = await request("POST", "/v1/media/create-upload-url", {
    mime_type: mimeType,
    size_bytes: stat.size,
    name: path.basename(file),
  });

  // Step 2: Upload binary
  const fileBuffer = fs.readFileSync(file);
  const uploadRes = await fetch(createRes.upload_url, {
    method: "PUT",
    headers: { "Content-Type": mimeType },
    body: fileBuffer,
  });

  if (!uploadRes.ok) {
    error(`Upload failed (${uploadRes.status})`);
    process.exit(1);
  }

  return { media_id: createRes.media_id };
}

// ── Output ──────────────────────────────────────────────────────────────────

function output(data) {
  console.log(JSON.stringify(data, null, 2));
}

function error(msg) {
  console.error(`\x1b[31mError:\x1b[0m ${msg}`);
}

function info(msg) {
  console.error(`\x1b[36mInfo:\x1b[0m ${msg}`);
}

// ── Arg parsing ─────────────────────────────────────────────────────────────

function parseArgs(args) {
  const parsed = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      const key = args[i].slice(2);
      const next = args[i + 1];
      if (!next || next.startsWith("--")) {
        parsed[key] = true;
      } else {
        parsed[key] = next;
        i++;
      }
    }
  }
  return parsed;
}

// ── Commands ────────────────────────────────────────────────────────────────

const COMMANDS = {
  setup: async (args) => {
    const parsed = parseArgs(args);
    const key = parsed.key || parsed["api-key"];

    if (!key) {
      error("Usage: ./scripts/post-bridge.js setup --key pb_live_xxxxx");
      error("Get your API key at: https://www.post-bridge.com/dashboard/api-keys");
      process.exit(1);
    }

    const global = !parsed.local;
    saveApiKey(key, global);
    info(`API key saved ${global ? "globally" : "locally"}.`);
    output({ status: "configured", location: global ? "global" : "local" });
  },

  accounts: async () => {
    const data = await request("GET", "/v1/social-accounts");
    output(data);
  },

  post: async (args) => {
    const parsed = parseArgs(args);

    if (!parsed.caption) {
      error("Usage: ./scripts/post-bridge.js post --caption \"...\" --accounts 1,2,3");
      process.exit(1);
    }

    if (!parsed.accounts) {
      error("Missing --accounts. Use: ./scripts/post-bridge.js accounts to list IDs.");
      process.exit(1);
    }

    const body = {
      caption: parsed.caption,
      social_accounts: parsed.accounts.split(",").map(Number),
    };

    if (parsed.media) {
      body.media = parsed.media.split(",");
    }

    if (parsed["media-urls"]) {
      body.media_urls = parsed["media-urls"].split(",");
    }

    if (parsed.schedule) {
      body.scheduled_at = parsed.schedule;
    }

    if (parsed["platform-config"]) {
      try {
        body.platform_configurations = JSON.parse(parsed["platform-config"]);
      } catch (e) {
        error("Invalid JSON in --platform-config");
        process.exit(1);
      }
    }

    if (parsed.draft) {
      body.is_draft = true;
    }

    const data = await request("POST", "/v1/posts", body);
    output(data);
  },

  posts: async () => {
    const data = await request("GET", "/v1/posts");
    output(data);
  },

  "posts:get": async (args) => {
    const parsed = parseArgs(args);
    if (!parsed.id) {
      error("Usage: ./scripts/post-bridge.js posts:get --id <post_id>");
      process.exit(1);
    }
    const data = await request("GET", `/v1/posts/${parsed.id}`);
    output(data);
  },

  "posts:delete": async (args) => {
    const parsed = parseArgs(args);
    if (!parsed.id) {
      error("Usage: ./scripts/post-bridge.js posts:delete --id <post_id>");
      process.exit(1);
    }
    const data = await request("DELETE", `/v1/posts/${parsed.id}`);
    output(data);
  },

  upload: async (args) => {
    const parsed = parseArgs(args);
    if (!parsed.file) {
      error("Usage: ./scripts/post-bridge.js upload --file ./image.jpg");
      process.exit(1);
    }
    const data = await uploadFile(parsed.file);
    output(data);
  },

  analytics: async () => {
    const data = await request("GET", "/v1/analytics");
    output(data);
  },

  "analytics:sync": async () => {
    const data = await request("POST", "/v1/analytics/sync");
    output(data);
  },

  results: async (args) => {
    const parsed = parseArgs(args);
    const query = parsed["post-id"] ? `?post_id=${parsed["post-id"]}` : "";
    const data = await request("GET", `/v1/post-results${query}`);
    output(data);
  },

  media: async () => {
    const data = await request("GET", "/v1/media");
    output(data);
  },

  "media:delete": async (args) => {
    const parsed = parseArgs(args);
    if (!parsed.id) {
      error("Usage: ./scripts/post-bridge.js media:delete --id <media_id>");
      process.exit(1);
    }
    const data = await request("DELETE", `/v1/media/${parsed.id}`);
    output(data);
  },

  help: async () => {
    output({
      name: "Post Bridge Agent Skill",
      version: "1.0.0",
      commands: Object.keys(COMMANDS).filter((c) => c !== "help"),
      docs: "https://www.post-bridge.com/agents",
      api_docs: "https://api.post-bridge.com/reference",
    });
  },
};

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const command = process.argv[2] || "help";
  const args = process.argv.slice(3);

  if (!COMMANDS[command]) {
    error(`Unknown command: ${command}`);
    error(`Available: ${Object.keys(COMMANDS).join(", ")}`);
    process.exit(1);
  }

  try {
    await COMMANDS[command](args);
  } catch (err) {
    error(err.message);
    process.exit(1);
  }
}

main();
