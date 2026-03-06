# Role: Chaos Engineer Agent

Part of the [AI agent roster](ai-agents.md).

---

## The Problem

Traditional testing (unit, integration, E2E) validates known expectations — "when I call registerUser with valid input, it returns a user." But it does not answer: "what happens when the database is slow AND a WebSocket reconnect happens simultaneously?" These unknown unknowns are where production outages come from.

Chaos engineering discovers these failure modes through controlled experiments. Netflix invented the discipline after a 3-day database corruption outage in 2008. Their insight: *"The best way to avoid failure is to fail constantly."*

With two developers and no SRE, we skip resilience work because it feels like a luxury. A chaos engineer agent makes it accessible by designing experiments, scripting fault injection, and analysing results — so we get SRE-grade resilience testing without the SRE.

## How Chaos Engineering Works

Every experiment follows four steps:

1. **Define steady state** — measurable outputs that indicate normal behaviour (e.g., message delivery latency < 500ms, zero messages lost)
2. **Form hypothesis** — "steady state will persist despite X" (e.g., "despite killing the DB mid-write, the sender receives an error and no message is silently dropped")
3. **Inject fault** — introduce the failure condition
4. **Analyse results** — was the hypothesis confirmed or disproved?

> This is the cycle validated by ChaosEater (NTT Research, 2025) — the first LLM-based system to fully automate chaos engineering. It ran complete cycles for under $1 in under 30 minutes.

## What the Agent Does

| Responsibility | Input | Output | Human Review? |
|---|---|---|---|
| **Experiment design** | Architecture docs, route definitions, database schema | Hypothesis + fault injection plan targeting a specific failure mode | Yes — human approves before any fault is injected |
| **Script generation** | Approved experiment plan | Toxiproxy configs, test scripts, steady-state assertions | Yes — human reviews scripts |
| **Result analysis** | Experiment output (logs, test results, error rates) | Report: hypothesis confirmed/disproved, root cause if disproved, suggested fix | Yes — human decides what to fix |
| **GameDay facilitation** | Quarterly schedule | Pre-GameDay briefing doc, scenario list, abort criteria, post-GameDay report template | Yes — human runs the GameDay |
| **Gap detection** | Test suite vs failure mode catalogue | "WebSocket reconnection during key exchange has no chaos experiment. Should we add one?" | Yes — human triages |

## What the Agent Does NOT Do

- Inject faults without explicit human approval
- Run experiments in production (staging/dev only until the team is confident)
- Fix discovered issues autonomously (it proposes fixes, humans implement)
- Run multiple concurrent experiments

## Failure Modes Specific to Vex

E2E encrypted messaging has failure modes that no off-the-shelf chaos tool covers. These require domain-specific experiment design.

### Key exchange failures

| Scenario | Fault Injection | Hypothesis |
|---|---|---|
| OTK pool exhausted | Delete all OTKs from a device's DB rows | X3DH degrades to signed prekey fallback (DH1-DH3 without DH4). Client is notified to replenish OTKs |
| Corrupt signed prekey | Edit signKey column to invalid hex | Server rejects corrupt key on read, returns error to key bundle request, does not distribute bad keys |
| Key bundle fetch fails | Toxiproxy `timeout` on `POST /device/:id/keyBundle` | Client retries with backoff, surfaces error to user |

### Message delivery failures

| Scenario | Fault Injection | Hypothesis |
|---|---|---|
| DB write fails during mail save | Toxiproxy `reset_peer` on DB connection mid-write | Sender receives `mail_save_failed` error. No message silently dropped (existing security invariant) |
| Server crash mid-fan-out | Kill process after delivering to device 1, before device 2 | Retry delivers to remaining devices. No duplicate delivery to device 1 |
| Slow mail fetch | Toxiproxy `latency` (2000ms) on inbox endpoint | Messages not double-delivered or lost during slow fetch |

### WebSocket failures

| Scenario | Fault Injection | Hypothesis |
|---|---|---|
| Disconnect during key exchange | Toxiproxy `reset_peer` on WS port mid-exchange | Client reconnects, resumes or restarts exchange cleanly |
| Half-open connection | Toxiproxy `slow_close` | Heartbeat/ping-pong detects dead connection within timeout window |
| Reconnect storm | Kill WS port, wait 5s, restore | All clients reconnect with backoff. Server does not OOM from simultaneous reconnections |

### Database corruption

| Scenario | Fault Injection | Hypothesis |
|---|---|---|
| Corrupt device key material | Manually edit `devices` table signKey/preKey columns | Server detects invalid hex/length on read, returns error, does not distribute corrupt keys |
| Kill SQLite mid-write | `kill -9` during WAL write | WAL recovery restores consistency on restart. No data loss |
| Token store cleared | Wipe in-memory token store | Client receives "token expired/invalid" error, can retry with fresh token |

## Tooling

| Tool | What It Does | Why It Fits |
|---|---|---|
| **Toxiproxy** (Shopify) | TCP proxy that injects network faults: latency, bandwidth limits, connection resets, timeouts, packet slicing | Sits between Express and DB or between client and server. Node.js client (`toxiproxy-node-client`). No Kubernetes required |
| **node-chaos-monkey** | Express middleware that injects application faults: 500 errors, memory leaks, event loop blocking, slow responses | Designed for Express. REST API at `/chaos` + web UI. Install via npm, enable in staging |
| **Manual scripts** | Custom fault injection for crypto-specific scenarios | No tool covers OTK exhaustion or key corruption. Shell scripts + Vitest assertions |

## Architecture Options

**Option A: Claude Code commands**

```
.claude/commands/
├── chaos-design.md       # Design an experiment for a given failure mode
├── chaos-script.md       # Generate Toxiproxy config + test script for an approved experiment
├── chaos-analyse.md      # Analyse experiment output, report on hypothesis
└── chaos-gameday.md      # Generate GameDay briefing doc for a quarterly exercise
```

Invoked on demand. The agent reads architecture docs, route definitions, and test files to understand the system, then designs experiments targeting specific failure modes.

Pros: zero infrastructure, version-controlled, integrates with existing Claude Code workflow.
Cons: reactive only, no continuous chaos testing.

**Option B: OpenClaw instance**

A dedicated OpenClaw agent that periodically reviews the codebase for untested failure modes and proposes new experiments.

Pros: proactive gap detection via heartbeat, 24/7 monitoring of test coverage vs failure catalogue.
Cons: requires OpenClaw infrastructure, security hardening.

**Recommendation:** Start with Option A. Chaos engineering is inherently human-supervised — you want to approve every experiment before it runs. Proactive monitoring (Option B) is a later optimisation.

## GameDay Format

Quarterly, 2-4 hours, structured exercise.

**Before (1-2 days prior):**
- Agent generates briefing doc: scenario, hypothesis, abort criteria, roles
- Team reviews and adjusts

**During:**
1. **Briefing** (15 min) — review scenario, hypothesis, abort criteria
2. **Phase 1 — Staging** (30-60 min) — run experiment in dev, observe, document
3. **Phase 2 — Expand scope** (30-60 min) — increase blast radius if Phase 1 passed
4. **Debrief** (30-60 min) — what happened, what surprised us, what needs fixing

**After:**
- Agent generates post-GameDay report from notes and logs
- Action items become beads
- Schedule next GameDay

## Progression

| Phase | What | Tooling |
|---|---|---|
| **Month 1** | Manual experiments — kill server during WS session, corrupt a DB row, add 500ms latency | `kill`, manual DB edits, curl |
| **Month 2** | Script experiments — repeatable fault injection with steady-state assertions | Toxiproxy, shell scripts, Vitest |
| **Month 3** | Integrate into CI — chaos experiments run as part of staging test suite | Toxiproxy + Vitest, node-chaos-monkey |
| **Month 4+** | Quarterly GameDays — structured exercises with documented outcomes | Full GameDay format with agent-generated briefings |

## Where Chaos Engineering Sits in Testing

```
                    /\
                   /  \
                  / CE  \        ← Chaos Engineering (staging)
                 /--------\
                / System    \    ← E2E tests, load tests
               /--------------\
              / Integration      \  ← Service interaction tests
             /--------------------\
            /    Unit Tests          \  ← Individual functions (255 tests today)
           /____________________________\
```

Unit and integration tests validate known expectations. Chaos engineering discovers unknown unknowns — the cascading failures, race conditions, and partial failures that only surface under real-world turbulence. They are complementary, not substitutes.

## Success Metrics

- Number of failure modes with documented experiments (target: cover all scenarios in the tables above within 6 months)
- GameDays run per quarter (target: 1)
- Production incidents caused by failure modes that had chaos experiments: zero
- Time from "experiment disproves hypothesis" to "fix merged": under 1 week
