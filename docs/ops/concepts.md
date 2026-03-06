# Core Concepts

The thinking behind how we plan Vex. Based on Jeff Patton's user story mapping (2005), adapted for a privacy-first team that uses git for strategy and Linear for execution.

---

## User Story Mapping

A story map arranges work along two axes:
- **Horizontal** — the user's journey through the product (narrative flow)
- **Vertical** — priority within each step (most critical at the top)

As Patton puts it: *"A flat backlog is a bag of context-free mulch."* Story maps give that mulch structure, context, and purpose.

### Anatomy

```
            +------------------- BACKBONE --------------------+
            |                                                  |
Journey:    Register    ->    Chat    ->    Groups    ->    Settings
            |                 |             |               |
Steps:      Pick name        Compose       Create server   Avatar
            Gen keys         Encrypt       Join invite      Theme
            Submit           Send          Post message     Devices
            |                 |             |               |
            +- Story A        +- Story D    +- Story G      +- Story J
            +- Story B        +- Story E    +- Story H      +- Story K
            +- Story C        +- Story F    +- Story I
                                                            ^
                             --- RELEASE 1 (MVP) ---        | priority
                             --- RELEASE 2 ---------        | (top = high)
                             --- RELEASE 3 ---------        v
```

### Key Terms

| Concept | Definition | Vex Example |
|---------|------------|-------------|
| **Backbone** | The horizontal narrative of journeys and steps. Represents the user experience. Never "done" — it just IS | Journeys 1-16 in `journeys.md` |
| **Journey** | A high-level user goal spanning multiple steps. Top row of the backbone | "Send an encrypted message" (Journey 4) |
| **Step** | A specific action within a journey, ordered left-to-right | "Resolve device → Key exchange → Encrypt → Send" |
| **Story / Rib** | A unit of work hanging below a step. The backbone is NOT prioritised; stories are | "Multi-device fan-out" (Linear issue) |
| **Release Slice** | A horizontal band across the map — all stories needed to ship an outcome. Top = ship first | Now/Next/Later sections in `roadmap.md` |
| **Walking Skeleton** | The thinnest end-to-end slice through every journey that produces a working system. The MVP | Register → Login → Send DM → Receive DM → Logout (done) |
| **Persona** | A research-backed user archetype. Different personas may follow different paths through the backbone | Privacy advocate, group organiser, casual user |
| **Story Map** | Two-dimensional backlog: user journey (horizontal) × priority (vertical) | `journeys.md` + `roadmap.md` together |
| **MVP** | Minimum Viable Product. The Walking Skeleton | See Walking Skeleton |
| **Now / Next / Later** | Roadmap format that groups work by planning maturity instead of calendar dates | `roadmap.md` |

For crypto and protocol terms (OTK, X3DH, key bundle, signKey, etc.) see [`glossary.md`](../glossary.md).

### Why Not a Flat Backlog?

| Flat Backlog | Story Map |
|---|---|
| Context-free list of tickets | Stories organised under the user journey they belong to |
| Prioritised by gut feel or loudest voice | Prioritised within context — "is this critical for *this step* of *this journey*?" |
| New team members see tasks, not product | New team members see the entire user experience at a glance |
| Easy to forget entire journeys | Missing journeys are visually obvious (empty columns) |
| Encourages "feature factory" | Encourages outcome thinking — "what slice delivers the most value?" |

---

## Three Layers: Strategy → Execution → Implementation

| Layer | Tool | Lives In | Changes |
|---|---|---|---|
| **Strategy** | `docs/ops/` (journeys, roadmap, personas) | Git | Slowly. Updated when we ship, discover, or reprioritise |
| **Execution** | Linear (issues, bugs, sprints) | Linear | Regularly. Technical scope, acceptance criteria, PR links |
| **Implementation** | bd/beads (granular tasks) | Git (`.beads/`) | Constantly. Daily status, agent workflows, dependency tracking |

A single roadmap item may spawn multiple Linear issues. A single Linear issue may spawn multiple beads. Strategy flows down; status flows up.

See [`README.md`](README.md) for workflows and how the layers connect day-to-day.
