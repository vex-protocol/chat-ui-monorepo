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
| **Step** | A specific action within a journey, ordered left-to-right | "Resolve device -> Key exchange -> Encrypt -> Send" |
| **Story / Rib** | A unit of work hanging below a step. These get prioritised and built. The backbone is NOT prioritised; stories are | "Multi-device fan-out" (Linear issue) |
| **Release Slice** | A horizontal band across the map — all stories needed to ship an outcome. Top = ship first | Now/Next/Later sections in `roadmap.md` |
| **Walking Skeleton** | The thinnest end-to-end slice through every journey that produces a working system. The MVP | Register -> Login -> Send DM -> Receive DM -> Logout (done) |
| **Persona** | A research-backed user archetype. Different personas may follow different paths through the backbone | Privacy advocate, group organiser, casual user |

### Why Not a Flat Backlog?

| Flat Backlog | Story Map |
|---|---|
| Context-free list of tickets | Stories organised under the user journey they belong to |
| Prioritised by gut feel or loudest voice | Prioritised within context — "is this critical for *this step* of *this journey*?" |
| New team members see tasks, not product | New team members see the entire user experience at a glance |
| Easy to forget entire journeys | Missing journeys are visually obvious (empty columns) |
| Encourages "feature factory" | Encourages outcome thinking — "what slice delivers the most value?" |

---

## Two Layers: Strategy + Execution

The story map is the **strategy layer**. The issue tracker is the **execution layer**. Separating them prevents engineers from losing user context, and prevents product people from micro-managing implementation details.

| Layer | Tool | Lives In | Changes |
|---|---|---|---|
| **Strategy** | `docs/ops/` (journeys, roadmap, personas) | Git | Slowly. Updated when we ship, discover, or reprioritise |
| **Execution** | Linear (issues, bugs, sprints) | Linear | Constantly. Daily status changes, technical details, PR links |

**The strategy layer answers:** What are we building? Why? In what order? What does the user experience look like?

**The execution layer answers:** Who's working on what? What's the acceptance criteria? Which PR implements this? What's blocked?

### How they connect

- Each **Now/Next/Later** item in `roadmap.md` may spawn multiple Linear issues
- Linear issues reference the journey number for context (e.g., "Journey 4: multi-device fanout")
- When a roadmap item is done, the strategy docs get updated. Linear issues get closed independently as the work ships
- Priority changes happen in `roadmap.md` first (strategy), then get reflected in Linear (execution)

---

## Glossary

| Term | Definition |
|------|------------|
| **Backbone** | The horizontal narrative of journeys and steps across the top of a story map. Not prioritised — it just "is" |
| **E2E Encryption** | End-to-end encryption. Sender encrypts, recipient decrypts. Server sees only ciphertext |
| **Fan-out** | Sending a message to all devices of all intended recipients. Critical for multi-device and group messaging |
| **Journey** | The end-to-end path a user takes to achieve a goal. Forms the backbone |
| **Key Bundle** | `{ signKey, preKey, otk? }` — the keys needed to establish an encrypted session with a device |
| **MVP** | Minimum Viable Product. The Walking Skeleton |
| **Now / Next / Later** | Roadmap format that groups work by planning maturity instead of calendar dates |
| **OTK** | One-Time Key. Single-use X25519 key consumed during X3DH. Provides forward secrecy |
| **Persona** | A research-backed user archetype representing a segment of users |
| **Pre-key** | Semi-static X25519 key pair uploaded to the server for asynchronous key exchange |
| **Release Slice** | A horizontal band across the story map containing all stories for a deliverable outcome |
| **Rib** | Individual stories hanging vertically below backbone steps. Ribs are prioritised; the backbone is not |
| **SignKey** | Ed25519 public key serving as a device's cryptographic identity |
| **Story** | A unit of deliverable work. Lives as a row in `roadmap.md` (strategy) and as issues in Linear (execution) |
| **Story Map** | Two-dimensional backlog: user journey (horizontal) x priority (vertical) |
| **Walking Skeleton** | The thinnest end-to-end slice through the backbone that produces a functioning system |
| **X3DH** | Extended Triple Diffie-Hellman. Key agreement protocol for establishing encrypted sessions between potentially-offline devices |
