# Role: Product Manager Agent

Part of the [AI agent roster](ai-agents.md).

---

## The Problem

A PM's core loop is: understand users → identify opportunities → prioritise work → communicate decisions. We do not have a PM. Today these responsibilities are spread across two developers who context-switch between coding and planning. The planning artifacts exist (`docs/ops/`) but nobody systematically maintains them or connects them to execution.

## What the Agent Does

The PM agent operates across our three layers (strategy → execution → implementation) with strictly bounded responsibilities:

| Responsibility | Input | Output | Human Review? |
|---|---|---|---|
| **Triage incoming issues** | New Linear issues, bug reports, user feedback | Suggested labels, priority, journey mapping, duplicate detection | Yes — human approves labels and priority |
| **Roadmap health check** | `roadmap.md`, `journeys.md`, recent git activity | Weekly digest: what shipped, what's stale, what should promote from Next to Now | Yes — human decides promotions |
| **Gap detection** | Journey coverage matrix vs shipped features | "Journey 7 (Verify Fingerprint) has no stories in Now or Next. Is this intentional?" | Yes — human triages |
| **Draft Linear issues** | Roadmap items moving to Now | Pre-filled Linear issue with title, description, journey link, acceptance criteria | Yes — human refines and creates |
| **Competitive / ecosystem watch** | Web search on configurable keywords | Monthly summary of relevant moves in encrypted messaging space | Yes — human filters signal from noise |

## What the Agent Does NOT Do

- Make strategic decisions (what to build, what to cut)
- Prioritise without human confirmation
- Modify `roadmap.md` or `journeys.md` directly
- Communicate with external stakeholders
- Access production data or user analytics

## Architecture Options

**Option A: OpenClaw instance**

A dedicated OpenClaw agent with a SOUL.md tuned for product management. Communicates through Slack or Discord. Runs on the same server as the dev environment.

```
SOUL.md (PM Agent)
├── Identity: "You are the PM agent for Vex"
├── Context: reads docs/ops/*.md on startup
├── Skills:
│   ├── linear-triage (label, deduplicate, assign)
│   ├── roadmap-digest (weekly summary)
│   ├── gap-detector (journey coverage analysis)
│   └── issue-drafter (pre-fill Linear issues)
├── Heartbeat: runs weekly roadmap health check
└── Rules: never modify files, always propose via message
```

Pros: runs 24/7, proactive via heartbeat, communicates through chat.
Cons: security hardening required, another process to maintain.

**Option B: Claude Code commands**

A set of `.claude/commands/` markdown files that define PM workflows, invoked on demand.

```
.claude/commands/
├── pm-triage.md        # Analyse new issues, suggest labels + priority
├── pm-roadmap-digest.md # Summarise what shipped, what's stale
├── pm-gap-check.md      # Compare journey matrix to shipped features
└── pm-draft-issue.md    # Pre-fill a Linear issue from a roadmap item
```

Pros: zero infrastructure, runs in existing Claude Code session, version-controlled.
Cons: reactive only (must be invoked), no 24/7 monitoring.

**Recommendation:** Start with Option B (Claude Code commands) for zero overhead, graduate to Option A (OpenClaw) when the workflows are proven and we want proactive monitoring.

## Integration with Existing Workflow

```
docs/ops/roadmap.md ──────── PM agent reads ────────> Weekly digest
     │                                                     │
     │                                                     v
     │                                          "Journey 10 has no Now items.
     │                                           Consider promoting Group DM
     │                                           from Next."
     │                                                     │
     │                                                     v
     │                                          Human approves or dismisses
     │                                                     │
     v                                                     v
Linear issue created ◄──── PM agent drafts ◄──── Approved promotion
     │
     v
bd create (beads for implementation)
```

## Success Metrics

- Time spent on backlog grooming drops (target: 50% reduction)
- No roadmap item sits in Now for more than 6 weeks without progress or re-evaluation
- Journey coverage gaps are surfaced within 1 week of a ship event
- Zero false positives in duplicate detection after 1 month of tuning
