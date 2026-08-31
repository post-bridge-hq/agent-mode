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

## Diagnose first: what actually fails, per platform

Measured across ~300,000 real posts in the 30 days to 2026-08-31. This is the
part worth memorising, because **each platform fails in one dominant way** and
the right response differs completely.

### Expected success rate

Judge an account against its own platform, never against 100%.

| platform | success | if you see much worse |
|---|---|---|
| LinkedIn | 97% | token expired, nothing else |
| X | 88% | spam block |
| YouTube | 88% | daily upload quota |
| Instagram | 87% | token, or transient platform errors |
| Facebook | 84% | token, or an identity gate |
| TikTok | 82% | spam restriction |
| Threads | 81% | token |
| Pinterest | 76% | missing or unreachable media |
| Bluesky | 71% | rate limit or takedown |

Bluesky at 71% and Pinterest at 76% are normal. An Instagram account at 40% is
not.

### The dominant cause on each platform

**TikTok: 75% of failures are spam restrictions.**
"Your account has been temporarily restricted." Not fixable, not a token
problem, and reconnecting does nothing. It lifts by itself, usually in 24 to 48
hours. Confirm in the TikTok app under Settings > Account > Account status. The
only real fix is posting less often on that account. A restricted account will
keep failing every scheduled post until it clears, so pause its queue rather
than letting it burn attempts.

**YouTube: 84% of failures are the daily upload quota.**
"The user has exceeded the number of videos they may upload." YouTube caps
uploads per channel per day, and the cap is lower for newer or unverified
channels. Nothing is broken. Spread uploads across more channels or more days.
Verifying the channel raises the cap. A distant second is "Only videos are
supported for YouTube posts", which means an image was sent to a video-only
surface.

**X: 92% of failures are a 403 spam block.**
"To protect our users from spam..." Posting too fast, too repetitively, or with
links. X charges far more for posts containing links, and link-heavy automated
posting is the fastest route to a block. Slow down and vary the text. A 429 is
the softer version of the same thing. "Your account is suspended" is terminal
and needs an appeal in the X app.

**Instagram: 50% token, 41% transient platform errors.**
Token errors need a reconnect. The transient half is Meta returning a 500, and
those often publish anyway despite reporting failure, so check the account
before republishing or you will double-post.

**Facebook: 39% token, 28% permission or policy, 11% identity confirmation.**
The identity one is Meta's "Confirm your identity before you can publish as this
Page." It is a Meta-side gate on the person, not a bug, and reconnecting will
not clear it. It needs 2FA plus identity confirmation at facebook.com/id. The
permission bucket is usually a missing scope, which a reconnect does fix.

**Threads: 68% token.** Almost everything else is transient. Reconnect and move
on.

**Pinterest: 46% "No files to post", 12% media deleted before publish.**
Pinterest is the pickiest about media. "No files to post" means nothing valid
was attached. "Sorry! This site doesn't allow you to save Pins" means the
destination domain blocks Pinterest saving, which is the target site's choice,
not yours. "We blocked this link because it may lead to spam" means the URL is
flagged; change the destination.

**Bluesky: rate limits, takedowns and unconfirmed emails.**
"Rate Limit Exceeded" means slow down. "Account has been taken down" is
terminal. "Invalid identifier or password" and the 401 on video upload usually
mean the account's email was never confirmed, which silently blocks uploads.
Confirm the email first; it is the single most common Bluesky fix.

**LinkedIn: 100% token.** With only 217 failures in 30 days it is the most
reliable platform by a wide margin. If LinkedIn fails, reconnect.

### The one distinction that saves the most time

**A platform restriction is the platform's decision about that account.** TikTok
spam limits, X 403s, YouTube quota, Bluesky rate limits. You cannot fix these
and neither can support. Reconnecting wastes time. The response is always the
same: post less often on that account and wait.

**A real failure is something you can act on.** Dead token, missing media,
wrong media type, unconfirmed email, blocked destination URL. These have fixes.

Getting this backwards is the biggest time sink in multi-account posting. One
operator we measured had five restricted TikTok accounts generating 770 doomed
attempts in 24 hours, which was 55% of all TikTok failures on the platform that
day. Nothing was broken. Nothing needed fixing.

## Bulk publishing

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

**Use the queue instead of hand-picking times.** `--use-queue` auto-schedules
into your saved slots, and `--queue-timezone <IANA tz>` overrides the timezone.
This is the easiest way to get spacing right, because the queue spreads posts
for you rather than you bunching them by accident.

Rules that matter at volume, and that map directly to the failure causes above:

- **Space posts on the same account.** Bunching is what triggers the TikTok
  restrictions and X 403s that dominate those platforms' failures.
- **Vary captions per account.** Identical text across many accounts on one
  platform is what spam classifiers look for.
- **Spread YouTube across channels and days.** The daily upload quota is
  per channel, and it is 84% of all YouTube failures.

## Reading results, per account

Every account publishes and reports independently. There is no single pass/fail
for a fan-out post, and treating it as one is how operators lose track of what
actually went live.

```bash
npx postbridge-cli results --post-id <post-id>   # omit --post-id for all recent results
```

One account failing does not stop the others, and the reason is attached to that
account, not to the batch. Read the reason against the per-platform table above
before acting: most of the time the answer is "wait", not "fix".

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

## Economics: why account count is the unit

Most schedulers bill per connected channel, which is fine at three accounts and
punishing at fifty. Post Bridge tiers on total accounts connected:

| accounts | Post Bridge | at $6 per channel |
|---|---|---|
| 5 | $29/mo | ~$30/mo |
| 15 | $39/mo | ~$90/mo |
| 50 | $59/mo | ~$300/mo |
| unlimited | $99/mo | more |

Below about five accounts a per-channel tool costs roughly the same. The gap
only matters at volume. Say that plainly rather than overselling it.

Posts are unlimited on every tier, so the plan limits how many accounts you
connect, never how much you publish.

## What this does not do

Say so early rather than letting someone waste a trial:

- No approval queues, no per-client sign-off, no client-facing reporting.
- No unified inbox, no comment management, no social listening.
- Scheduled posts cannot attach trending audio on Instagram or TikTok. No
  third-party tool can; that lives inside those apps. Post those natively.
