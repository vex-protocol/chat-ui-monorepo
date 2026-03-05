# Ops

How Vex Heavy Industries plans and ships — without paying for planning tools.

> We don't pay rent to plan our own product. Git is the source of truth for strategy. Linear handles execution. Markdown is the interface. Diffs are the audit trail.

---

## What's In This Folder

| File | Purpose |
|---|---|
| `journeys.md` | User journey maps — the story map backbone. What users do, what breaks, where the opportunities are |
| `roadmap.md` | Now/Next/Later roadmap. The big picture: what we're building, in what order, and why |
| `concepts.md` | Story mapping methodology, core concepts, and glossary |
| `personas.md` | User archetypes (when we have research data) |

## Two Layers

| Layer | Where | What | Changes |
|---|---|---|---|
| **Strategy** | `docs/ops/` (this folder) | Journeys, roadmap, priorities, release goals | Slowly — when we ship, discover, or reprioritise |
| **Execution** | Linear | Issues, bugs, PRs, sprint tracking, technical details | Constantly — daily |

**Strategy answers:** What are we building? Why? In what order? What does the user experience look like?

**Execution answers:** Who's working on what right now? What's the acceptance criteria? Which PR? What's blocked?

### How they connect

- Each **Now/Next/Later** item in `roadmap.md` may spawn multiple Linear issues
- Linear issues reference the journey number for context (e.g., "Journey 4: multi-device fan-out")
- When a roadmap item ships, update `roadmap.md` (move to Done) and `journeys.md` (update pain points)
- Priority changes start in `roadmap.md`, then get reflected in Linear

## Workflows

### Starting a new initiative

1. Read `roadmap.md` — what's in Now?
2. Read the journey(s) referenced — understand the user context
3. Create Linear issues for the technical work
4. Ship it
5. Update `roadmap.md` and `journeys.md` when done

### Discovered a bug or gap

1. Does it affect a journey? Note the pain point in `journeys.md`
2. Is it strategic (P0-P1, affects core promise)? Add to `roadmap.md` under Now or Next
3. Create a Linear issue for the technical work
4. If it's small and tactical, just the Linear issue is fine — not everything needs a roadmap entry

### Six-week review

1. Is Now empty? Promote from Next
2. Is anything in Next actually Later? Move it
3. Are the journeys still accurate? Update pain points
4. Has a new journey emerged? Write it up
5. Commit the review as a single diff

## What This Replaces

| Need | SaaS Solution | Our Solution | Cost |
|---|---|---|---|
| Story map | Avion ($99/mo) | `journeys.md` | $0 |
| Roadmap | Avion addon (+$83/mo) | `roadmap.md` | $0 |
| Issue tracking | Jira ($10/seat/mo) | Linear | Linear pricing |
| Personas | Avion personas | `personas.md` | $0 |
| Decision history | Nothing | `git log docs/ops/` | $0 |

For a privacy company that doesn't trust third parties with user data, we keep strategy in git where we control it. Execution goes to Linear because issues change too fast for git commits to keep up.
