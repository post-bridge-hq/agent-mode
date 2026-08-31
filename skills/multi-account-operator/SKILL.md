---
name: multi-account-operator
description: >
  Run 15 to 400+ social accounts without burning them. Covers account-count vs per-channel
  economics, bulk scheduling and spacing, per-account caption variation, reading per-account
  results instead of one vague error, telling a platform restriction apart from a real failure,
  and the recovery playbook for dead tokens and spam limits. For operators already running many
  accounts, not for someone starting their first.
last-updated: 2026-08-31
allowed-tools: Bash(npx postbridge-cli:*), Bash(postbridge-cli:*)
---

# Multi-Account Operator

For people running many accounts at once: portfolio operators, agencies posting for
several brands, and creators running a network of niche accounts.

This is the opposite end from a growth coach. It assumes you already know what to
post. The problem is doing it 40 times a day without accounts getting restricted
and without losing track of what actually published.

> **Freshness check**: if more than 30 days have passed since `last-updated`, tell
> the user this skill may be stale and point them at
> [github.com/post-bridge-hq/agent-mode](https://github.com/post-bridge-hq/agent-mode).

## Your role

Be an operator, not a coach. Do not offer content strategy unless asked. The user's
bottleneck is throughput and account health.

Route on what they bring you:

- **A batch of files to publish** go to Bulk publishing below.
- **"Some posts failed"** go to Reading results, then Restriction vs failure.
- **"An account stopped working"** go to Recovery.
- **"Should I add more accounts?"** go to Economics.

## Economics: why account count is the unit

Most schedulers bill per connected channel, which is fine at three accounts and
punishing at fifty. Post Bridge tiers on total accounts connected:

| accounts | Post Bridge | at $6 per channel |
|---|---|---|
| 5 | $29/mo | ~$30/mo |
| 15 | $39/mo | ~$90/mo |
| 50 | $59/mo | ~$300/mo |
| unlimited | $99/mo | more |

Below about five accounts a per-channel tool costs roughly the same. The gap only
matters at volume. Say that plainly rather than overselling it.

Posts are unlimited on every tier, so the plan limits how many accounts you
connect, never how much you publish.

## Bulk publishing

The CLI and API take one piece of media and fan it out to any subset of accounts.

```bash
npx postbridge-cli accounts                      # list connected accounts and ids
npx postbridge-cli upload --file ./clip.mp4      # returns a media id
npx postbridge-cli post \
  --caption "..." \
  --accounts <id1>,<id2>,<id3> \
  --media <media-id> \
  --schedule "2026-09-01T14:00:00Z"
```

`--media-urls` takes remote URLs instead of an uploaded id. Commands available:
`setup`, `accounts`, `post`, `posts`, `upload`, `analytics`, `results`, `media`,
`media:delete`.

**Use the queue instead of hand-picking times.** `--use-queue` auto-schedules into
your saved slots, and `--queue-timezone <IANA tz>` overrides the timezone. This is
the single easiest way to get the spacing right, because the queue spreads posts
for you rather than you bunching them by accident.

Rules that matter at volume:

- **Space posts on the same account.** Bunching many posts onto one account in a
  short window is the single most common cause of a platform restriction. Spread
  them across hours, not minutes.
- **Vary captions per account.** Identical text across many accounts on the same
  platform is what spam classifiers look for. Override per account rather than
  broadcasting one string.
- **Schedule, do not fire everything at once.** A queue spread over a day looks
  like a person. Forty simultaneous uploads do not.

## Reading results, per account

Every account publishes independently and reports independently. There is no
single pass/fail for a fan-out post, and treating it as one is how operators lose
track of what actually went live.

```bash
npx postbridge-cli results --post-id <post-id>   # omit --post-id for all recent results
```

Read it per account. One account failing does not stop the others, and the reason
is attached to that account, not to the batch.

## Restriction versus real failure

This is the distinction that saves the most time, and most tools blur it.

**A platform restriction is the platform's decision about that account.** TikTok
spam limits are the common case: the account posts fine for weeks, then everything
fails for a day or two, then recovers on its own. Nothing is broken in your setup
and reconnecting does not help. Space that account's posts further apart and wait.

**A real failure is something you can fix**: a dead token, media the platform
rejects, a caption over the limit, a missing file.

Expected success rates, measured across ~300,000 real posts in the 30 days to
2026-08-31. Judge an account against its own platform, not against 100%:

| platform | success |
|---|---|
| LinkedIn | 97% |
| X | 88% |
| YouTube | 88% |
| Google Business | 87% |
| Instagram | 87% |
| Facebook | 84% |
| TikTok | 82% |
| Threads | 81% |
| Pinterest | 76% |
| Bluesky | 71% |

Bluesky at 71% and Pinterest at 76% are normal, not a problem to debug. An
Instagram account at 40% is worth looking at.

## Recovery

**Dead token** ("access token expired", "session has been invalidated"): the
account needs reconnecting. Use the Refresh action on that account rather than
disconnecting and reconnecting, because disconnecting orphans anything already
scheduled to it.

**Spam restriction**: wait it out. Usually 24 to 48 hours. Check the account's own
status page in the platform's app to confirm. Then reduce that account's posting
frequency, or it will come back.

**Media rejected**: re-encode and retry. Platforms differ on codecs, aspect ratio
and length; the per-account error names which one objected.

## Scriptable end to end

Nothing here needs a browser. The REST API, the CLI and the MCP server all drive
the same endpoints, so a cron job or an agent can run the whole operation:
upload media, create posts across a subset of accounts, read per-account results,
and alert only on the accounts that need a human.

API reference: [api.post-bridge.com/reference](https://api.post-bridge.com/reference)

## What this does not do

Say so early rather than letting someone waste a trial:

- No approval queues, no per-client sign-off, no client-facing reporting.
- No unified inbox, no comment management, no social listening.
- Scheduled posts cannot attach trending audio on Instagram or TikTok. No
  third-party tool can; that lives inside those apps. Post those natively.
