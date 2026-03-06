# AI Agents for a Small Team

How Vex Heavy Industries uses AI agents to fill roles that traditional software companies staff with full-time hires. We are two developers and a designer — agents handle the rest.

> *"Start small, stay narrow, and optimize for trust over capability. The wow-factor demos might get you funding, but the boring, reliable agents will keep your users."*

---

## Principles

**Narrow beats broad.** The pattern that works is not "replace the PM with an AI" — it is giving each human a squad of narrow, bounded AI agents. Broad autonomous agents (AutoGPT-style) fail 95% of the time. Specialized agents with clear roles and human review loops actually ship.

**Specialization over generalization.** One agent per job, strict guardrails, human approval on outputs. Teams that tried one "super agent" to do everything failed. Bounded agents with clear roles succeed.

**Config-driven, not code-driven.** Agent behaviour should be defined in markdown and configuration, not in application code. This makes agents reviewable, versionable, and accessible to non-engineers. Both OpenClaw (SOUL.md) and Claude Code (`.claude/commands/`) follow this pattern.

**Propose, don't act.** Agents draft; humans approve. The moment you remove the review step — even accidentally, because the team gets busy — trust erodes and quality collapses. The 2025 Stack Overflow survey found only 29% of developers trust AI outputs (down from 40% in 2024).

**Self-hosted or nothing.** For a privacy-first project, agent infrastructure must run on hardware we control. No sending strategy docs, roadmaps, or user research through third-party SaaS agent platforms. OpenClaw is self-hosted by design. Claude Code runs locally.

---

## The Agent Roster

| Role | What the Agent Does | Tool | Detail | Status |
|---|---|---|---|---|
| **Product Manager** | Triages issues, proposes roadmap changes, drafts Linear issues from journey gaps | Linear AI + OpenClaw | [ai-agent-pm.md](ai-agent-pm.md) | Planned |
| **Scrum / Standup** | Summarises daily progress, surfaces blockers, maintains velocity awareness | Spinach.ai or OpenClaw | [ai-agent-scrum.md](ai-agent-scrum.md) | Planned |
| **Chaos Engineer** | Designs fault injection experiments, identifies resilience gaps, runs GameDays | Toxiproxy + Claude Code | [ai-agent-chaos.md](ai-agent-chaos.md) | Planned |

---

## Next Steps

1. Build the Claude Code commands for PM triage and daily digest (Option B for both)
2. Trial for 2 weeks, measure time savings and signal quality
3. If proven, deploy OpenClaw instances for 24/7 proactive operation

See [`concepts.md`](concepts.md) for the three-layer model (strategy → execution → implementation) that these agents operate within.
