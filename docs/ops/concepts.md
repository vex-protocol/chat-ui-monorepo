# Core Concepts

The thinking behind how we plan Vex. Based on Jeff Patton's user story mapping (2005), adapted for a privacy-first team that uses git for strategy, Linear for execution.

> *"Shared documents aren't shared understanding."* — Jeff Patton

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

## Discovery vs Delivery

Story mapping bridges two kinds of work that Patton calls "dual-track development" — not competing tracks, but two halves of one process.

> *"There are two kinds of work, and there's no way around it."* — Jeff Patton

| | Discovery | Delivery |
|---|---|---|
| **Focus** | Fast learning and validation | Predictability and quality |
| **Mindset** | Experimental, divergent | Convergent, disciplined |
| **Output** | Validated hypotheses, prototypes, story maps | Working, tested, shippable software |
| **Cadence** | Rapid cycles (Build-Measure-Learn) | Sprint/iteration cycles |

During **discovery**, the map frames the problem space: who are the users, what journeys matter, what are we trying to learn? During **delivery**, the map slices releases: what is the thinnest viable slice, what should we build first?

The story map is the shared artifact that keeps both tracks aligned.

---

## Release Slicing

The horizontal lines through the map divide stories into release slices. Each slice should contain stories from **across** the backbone (not just one journey). The key question: **"What outcome does this slice deliver to users?"**

### Three Phases

Patton divides releases into three phases (borrowed from chess):

| Phase | Focus | Actions |
|---|---|---|
| **Opening** ("See it work") | Build the walking skeleton | Focus on essentials and risky things. Skip edge cases. Build just enough for end-to-end functionality |
| **Mid Game** ("Make it better") | Complete major functionality | Fill in and round out features, add edge cases. Test performance, scalability, usability |
| **End Game** ("Make it releasable") | Refine for release | Polish, find improvement opportunities, test with real data, get user feedback |

> *"The minimum viable product is the smallest product release that successfully achieves its desired outcomes."* — Jeff Patton

### Thin Slice vs Feature Complete

- **Thin Slice (Walking Skeleton):** The smallest set of stories that produces end-to-end working functionality across every journey. Intentionally incomplete — it proves the architecture and the flow, not the polish.
- **Feature Complete:** Every story under every step is done. The bottom of the map. You almost never ship this as release 1 — instead, you slice horizontally and ship increments.

### Name Slices by Outcome

Name release slices by what they achieve, not by version numbers or dates:

- "Encrypted group chat" (not "v2.3")
- "Multi-device support" (not "Sprint 14 release")
- "File sharing" (not "Release 2")

This is why `roadmap.md` uses Now/Next/Later instead of calendar dates — it groups work by planning maturity, not by false time commitments.

---

## Now / Next / Later

Invented by Janna Bastow (co-founder of ProdPad and Mind the Product) as a response to the failure of timeline-based roadmaps, which create false promises and deadline-driven dysfunction.

| Column | Time Horizon | Confidence | What Belongs Here |
|---|---|---|---|
| **Now** | Current work (weeks) | High — scope is defined, work is in progress | Items with clear acceptance criteria, assigned resources, understood dependencies |
| **Next** | Coming soon (1-3 months) | Medium — we know it matters, scope is emerging | Items being scoped, validated, or waiting on prerequisites |
| **Later** | Future (3+ months) | Low — important but not yet scoped | Strategic bets, validated problems without committed solutions |

### Rules of Thumb

- **Now should be small.** 5-7 items max. Each should be translatable into concrete Linear issues.
- **Next contains validated problems, not committed solutions.** "Local message persistence" is a good Next item. "Build SQLite integration with Tauri SQL plugin" is premature — it presumes the solution before scoping is complete.
- **Later is a curated strategic reserve, NOT a dumping ground.** Every Later item should connect to a user journey or business goal. Items without a "Why" should be deleted, not parked.
- **Never assign dates.** The moment you write "Q3" next to a Later item, stakeholders read it as a commitment.

### Anti-Patterns

| Anti-Pattern | Symptom |
|---|---|
| **Later as junk drawer** | Later grows to 50+ items. Nobody reads it |
| **Now with vague items** | "Improve onboarding" in Now without concrete scope |
| **Missing exit criteria** | No definition of when Now is "done" and Next items promote |
| **Feature-listing without Why** | Items listed without connection to user need or journey |

---

## Personas

Based on Alan Cooper's goal-directed methodology (*The Inmates Are Running the Asylum*, 1999). Personas are research-based archetypes, not demographics.

### Persona Types

| Type | Definition | Example |
|---|---|---|
| **Primary** | Must be satisfied. Drives the design. Cannot be satisfied by an interface designed for any other persona | Privacy advocate |
| **Secondary** | Mostly satisfied by primary's design, has some additional needs | Group organiser |
| **Supplemental** | Fully satisfied by primary or secondary design | Casual user |
| **Negative** | Explicitly NOT designing for | Surveillance operators, trolls |

### What a Persona Contains

| Element | Purpose |
|---|---|
| **Name** | Makes the persona concrete and referable |
| **Archetype** | One-line summary |
| **Goals** | End goals (what they want to accomplish), experience goals (how they want to feel) |
| **Behaviours** | What distinguishes this persona — e.g., verifies fingerprints, uses multiple devices |
| **Pain points** | What frustrates them about current solutions |
| **Journey emphasis** | Which journeys matter most to this persona |

The "Journey emphasis" field is the bridge between personas and the story map. It tells you which backbone columns this persona cares about, which directly informs release slicing.

Our `journeys.md` Persona column currently uses informal labels ("New user," "Security-conscious user," etc.). These are proto-personas — useful but not fully developed. When we have research data, `personas.md` will flesh these out.

---

## Anti-Patterns

Common mistakes from Patton's "Five Story Mapping Mistakes" and the broader methodology.

| Anti-Pattern | What Goes Wrong | The Fix |
|---|---|---|
| **Mapping features, not journeys** | Cards are all nouns ("Search," "Settings"). The map becomes feature decomposition | Start with a person. Tell their story. Cards should be verbs: "Search for a contact," "Change avatar" |
| **Going too granular too early** | Hundreds of cards before the backbone is complete. "Map shock" | Think "mile wide, inch deep." Get from beginning to end before dropping into detail on any step |
| **Not understanding users** | The team maps from assumptions, not research. The map reflects what the team thinks users want | Talk to users first. You cannot story-map your way out of ignorance |
| **Wrong people in the room** | Too many people → groupthink. Too few → blind spots | 6-10 people. Must include: someone who decides, someone who builds, someone who designs, someone who knows the domain |
| **Mapping too much scope** | Trying to boil the ocean and map the entire product in one session | Scope the session. Map one journey or one feature area at a time |
| **Template zombie** | Work is driven by templates instead of thinking. Stories become "another annoying way to express software requirements" | Stories get their name from how they should be used, not what should be written |
| **Separating decision-makers and builders** | People deciding what to build never talk to people building it. Shared understanding is impossible | Small groups make decisions together. Use conversations to share results with everyone else |

> *"Scope doesn't creep; understanding grows."* — Jeff Patton

---

## Map Maintenance

A story map is a living document. Without attention, it becomes stale and loses value.

### When to Revisit

| Trigger | What to Do |
|---|---|
| **Something ships** | Move stories to Done. Update `roadmap.md` and `journeys.md` pain points |
| **User research / feedback** | Add newly discovered stories, reorder priorities, possibly add new backbone steps |
| **New team member joins** | Use the map for onboarding. If the map confuses them, it is stale |
| **Six-week review** | Is Now empty? Promote from Next. Is anything in Next actually Later? Move it. Has a new journey emerged? Write it up |
| **Strategy shift** | Major surgery — possibly redraw slices or redefine personas |

### Signals the Map Is Stale

- Team members cannot "tell the story" by walking the backbone left to right
- New work is planned without referencing the map
- The map no longer matches what is actually in the product
- Stories are created in Linear that have no home on the map

### Onboarding with the Map

A new team member reads the story map in three steps:

1. **Read the backbone left-to-right.** The top row is a narrative of the entire user experience. "Register → Login → Send Message → Receive Message → Search → Verify → Create Server..." This takes 2 minutes. A backlog with 400 tickets cannot do this.
2. **Walk a single journey top-to-bottom.** Pick Journey 4 (Send Direct Message). Read the steps, then the stories underneath from top (highest priority) to bottom (lowest). Now you understand what matters most for this journey.
3. **Find the release boundary.** The horizontal slice between Now and Next is the current focus. Everything above it is what we are building right now.

---

## Three Layers: Strategy → Execution → Implementation

| Layer | Tool | Lives In | Changes |
|---|---|---|---|
| **Strategy** | `docs/ops/` (journeys, roadmap, personas) | Git | Slowly. Updated when we ship, discover, or reprioritise |
| **Execution** | Linear (issues, bugs, sprints) | Linear | Regularly. Technical scope, acceptance criteria, PR links |

A single roadmap item may spawn multiple Linear issues. Strategy flows down; status flows up.

### Why Git for Strategy?

| Advantage | Detail |
|---|---|
| **Diffs as audit trail** | Every priority change, every promotion from Next to Now, every item added or removed is a commit |
| **No vendor lock-in** | These docs will exist as long as git exists. SaaS tools get acquired, shut down, or change pricing |
| **Co-located with code** | Strategy and implementation live in the same repo. No context-switching between tools |
| **Review via PR** | "I'm promoting local persistence from Next to Now" is a reviewable diff |
| **Privacy** | For a privacy-focused product, keeping strategy docs out of third-party SaaS is philosophically consistent |

The trade-off is no visual layout — you lose drag-and-drop and spatial "see the whole map at a glance." We accept this because the mental model matters more than the visualisation, and we gain diffability, version history, and zero vendor dependency.

See [`README.md`](README.md) for workflows and how the layers connect day-to-day.

---

## Related Frameworks

Story mapping does not exist in isolation. These frameworks complement it at different stages.

| Framework | What It Does | How It Connects |
|---|---|---|
| **Opportunity Solution Trees** (Teresa Torres) | Maps desired outcomes → customer opportunities → solutions → assumption tests | Operates upstream of story mapping. Use OSTs to decide *what* to build, then story-map *how* to build it |
| **Jobs to Be Done** (Christensen, Ulwick) | Uncovers the functional, emotional, and social "jobs" customers hire products to do | Frames the overall intent and emotional context. Story maps translate that into functionality |
| **Shape Up** (Basecamp) | Fixed time (6 weeks), variable scope. Pitches, betting table, no persistent backlog | Alternative to story mapping. Shape Up deliberately forgets; story mapping deliberately remembers. Shape Up works better for mature products where the team knows the domain deeply |
| **RICE** (Intercom) | Scores items by Reach × Impact × Confidence / Effort | Complementary. Use the story map to see what stories exist and how they relate, then use RICE to score stories within a slice when making trade-offs |

```
Personas / JTBD ──────> Discovery (what problem to solve?)
     │
     v
Opportunity Solution Tree ──> Which opportunity is most valuable?
     │
     v
Story Map ──────────────> How does the solution look as a user journey?
     │                    How do we slice it for delivery?
     │
     ├──> RICE ──────────> Within a slice, which story first?
     │
     └──> Shape Up ──────> Alternative: time-box a shaped pitch
                           instead of slicing from a persistent map
```

> *"Prioritize specific business goals, customers, and users, and then their goals, before prioritizing features."* — Jeff Patton
