# Role: Scrum / Standup Agent

Part of the [AI agent roster](ai-agents.md).

---

## The Problem

With three people, synchronous standups are wasteful — we already know what each other is doing. But we lose the benefits of standups: surfacing blockers early, maintaining momentum awareness, and catching work that has silently stalled. Beads tracks individual tasks but nobody synthesises the big picture daily.

## What the Agent Does

| Responsibility | Input | Output | Human Review? |
|---|---|---|---|
| **Daily async digest** | `git log` (last 24h), `bd ready`, `bd list --status=in_progress`, open PRs | Slack/Discord message: what shipped, what's active, what's blocked | No — informational |
| **Blocker detection** | Beads dependency graph, stale in-progress items (>3 days no commit) | Alert: "vex-chat-0zs has been in_progress for 5 days with no commits. Is it blocked?" | Yes — human responds |
| **Sprint-less velocity** | Git commit frequency, beads closed per week, rolling 4-week trend | Weekly velocity summary: "This week: 4 beads closed, 12 commits. Trend: flat vs last 4 weeks." | No — informational |
| **Meeting summarisation** | Voice/video call transcript (via Spinach.ai or Otter.ai) | Action items extracted, beads created for follow-ups, summary posted to Slack | Yes — human confirms action items |

## What the Agent Does NOT Do

- Run or facilitate synchronous meetings
- Assign work or change priorities
- Nag people about deadlines
- Report velocity to anyone outside the team
- Make judgements about individual productivity

## Architecture Options

**Option A: OpenClaw instance**

A dedicated OpenClaw agent running on a 30-minute heartbeat. Reads git history and beads state, posts a morning digest to Slack/Discord.

```
SOUL.md (Standup Agent)
├── Identity: "You are the standup agent for Vex"
├── Context: reads .beads/ directory, git log
├── Skills:
│   ├── daily-digest (morning summary)
│   ├── blocker-alert (stale work detection)
│   └── velocity-summary (weekly trend)
├── Heartbeat: every morning at 09:00
└── Rules: never assign work, never judge productivity, informational only
```

Pros: runs automatically, proactive, posts to team chat without anyone invoking it.
Cons: requires OpenClaw infrastructure, another process.

**Option B: Claude Code commands + cron**

Claude Code commands for each digest type, triggered by a cron job or manually.

```
.claude/commands/
├── standup-digest.md     # Summarise last 24h of git + beads activity
├── standup-blockers.md   # Flag stale in-progress items
└── standup-velocity.md   # Weekly velocity trend
```

A lightweight shell script runs `claude` with the digest command each morning and posts output to a Slack webhook.

Pros: minimal infrastructure, leverages existing tools, version-controlled.
Cons: requires a machine that runs the cron job, less interactive than a chat-based agent.

**Option C: Spinach.ai (free tier)**

For meeting summarisation specifically. Spinach.ai joins video calls, transcribes, extracts action items, and can create Linear tickets. Free for small teams.

Pros: zero setup for meeting capture, excellent transcription quality.
Cons: SaaS dependency (acceptable since meeting audio is transient, not strategy docs).

**Recommendation:** Option B for daily digests (zero infrastructure), Option C for meeting summarisation (best-in-class transcription). Graduate to Option A when we want a persistent, proactive standup bot in chat.

## Daily Digest Format

```
## Vex Daily — March 6, 2026

### Shipped
- eff1167 docs: reorganize into Diátaxis folders
- 2eda542 docs: clean up ops/concepts.md
- 8bdb675 docs: expand concepts.md with story mapping deep dive

### Active (in_progress)
- vex-chat-0zs (P0): Mail save errors silently swallowed — 2 days active
- vex-chat-aal (P0): OTK upload must verify device ownership — 1 day active

### Ready (unblocked, unclaimed)
- vex-chat-dq7 (P0): Multi-device fan-out
- vex-chat-gus (P1): Logout must clear all nanostores atoms
- vex-chat-7lh (P1): Add auth-specific rate limit

### Blockers
- None detected

### Velocity (4-week rolling)
- This week: 3 beads closed, 8 commits
- Average: 4 beads closed, 11 commits
- Trend: ▬ flat
```

## Integration with Existing Workflow

```
cron (09:00 daily)
     │
     v
claude --command standup-digest
     │
     ├── reads: git log --since="24 hours ago"
     ├── reads: bd list --status=in_progress --json
     ├── reads: bd ready --json
     │
     v
Formatted digest
     │
     v
Slack webhook POST
     │
     v
Team reads in #standup channel
```

## Success Metrics

- Team members read the digest (Slack read receipts or reactions)
- Stale work is flagged within 48 hours of going idle
- No surprises in weekly sync — the digest catches everything first
- Meeting action items have a >80% conversion rate to beads/Linear issues
