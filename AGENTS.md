# Agent Instructions

This project uses **bd** (beads) for issue tracking. Run `bd onboard` to get started.

## What We Are Building


**Vex** is an end-to-end encrypted, privacy-first chat platform built by Vex Heavy Industries LLC ("Privacy enthusiasts"). All code is **AGPL-3.0**.

### Platform

Vex targets desktop and mobile as a cross-platform monorepo:

| Platform | Shell | UI Framework |
|---|---|---|
| Desktop | **Tauri 2.0** | **Svelte** |
| Mobile | **React Native** | React Native |
| Server | **Node.js** | Express + Kysely |

Shared packages (`types`, `core`, `crypto`, `validation`, `store`) are framework-agnostic TypeScript. Design system primitives live in `packages/ui` as **Mitosis** `.lite.tsx` files that compile to both Svelte and React. See `docs/platform/platform-strategy.md` for the full architecture and `docs/platform/design-system.md` for the Figma ↔ Storybook pipeline.

`apps/spire` is a clean reimplementation of [`vex-chat/spire`](https://github.com/vex-chat/spire) — the Vex server — using modern tooling (Kysely, Zod, Vitest, ESM) while preserving full protocol and privacy compatibility with the original.

The Vex platform works as follows:
- Messages are **end-to-end encrypted** using TweetNaCl (NaCl/Curve25519). The server stores only ciphertext, never plaintext.
- **Identity is device-key-bound.** Each device generates a NaCl Ed25519 signing key pair. The private key never leaves the device.
- **Mail** is the encrypted message format. Each mail is addressed to a specific device ID, not a user.
- **Pre-key bundles** enable session establishment (X3DH-style): `{ signKey, preKey, otk? }`. OTKs are consumed server-side during key exchange.
- **WebSocket** (`/socket`) delivers real-time `notify` events to connected devices.
- The full protocol is documented in `docs/vex-overview.md`.

## Privacy Principles

**This is a privacy-first, end-to-end encrypted chat server.** Every design decision must be evaluated against this principle.

### Core model

- **User identity is cryptographically bound to client-generated device key pairs.** The server never sees private keys. It only verifies signatures.
- **The server cannot forge user identities or actions.** All privileged operations require a valid NaCl Ed25519 signature from a registered device key.
- **Action tokens are single-use, in-memory UUIDs — not JWTs.** They are consumed on first valid use and cannot be replayed.
- **Token redemption requires a NaCl device signature.** Possessing a token UUID alone is not sufficient — the client must also prove ownership of the registered device key by signing the token UUID bytes.
- **userID is derived from client crypto**, not server-assigned. It equals `uuid.stringify(nacl.sign.open(signed, devicePublicKey))`, binding the identity to the registration event and device key.

### Implementation rules

- Use `tweetnacl` for all NaCl Ed25519 operations (sign, verify, key generation).
- NaCl signature verification happens at the **route/middleware layer** before any service function is called.
- Service functions (e.g. `registerUser`, `createDevice`) receive already-verified data — they do not re-verify signatures.
- Action token store is created per server instance (`createTokenStore()` factory) — never a module-level singleton, for testability.
- JWT secret (`JWT_SECRET`) is separate from the NaCl server signing key. Do not conflate them.
- **Derive TypeScript types from Zod schemas** using `z.infer<typeof Schema>`. Never write a separate `interface` that mirrors a `z.object(...)` — they will drift. Export the type alongside the schema from the same `schemas.ts` file.
- **Validate at the route boundary, not inside service functions.** Use the `validateBody(schema)` / `validateParams(schema)` middleware factories from `src/middleware/validate.ts`. Route handlers receive a typed, already-validated `req.body`. Service functions trust their typed arguments.
- **Route handlers must be thin (under 15 lines).** No business logic in route handlers. One service call per handler. Fat controllers are forbidden.
- **Extend `req.user` / `req.device` via `src/types/express.d.ts`.** Never cast `req as AuthenticatedRequest` inside a handler. Use `declare global { namespace Express { interface Request { user?: CensoredUser } } }` so the types are available everywhere.
- **Error middleware must declare exactly 4 parameters: `(err, req, res, next)`.** Express identifies error-handling middleware by `function.length` — omitting `next` makes Express skip it entirely.
- **Middleware order in `buildApp()`: helmet → cors → body-parser → rate-limit → pino-http → routes → 404 → error handler.**
- Strip sensitive fields (`passwordHash`, `passwordSalt`) from any JWT payload or API response. Only `{ userID, username, lastSeen }` is ever exposed (censoredUser pattern).
- **Mail MUST be deleted from the server after it is fetched by the intended recipient.** The server is a relay, not a store. Do not retain delivered mail.
- **Mail save failures MUST propagate as errors.** Never silently swallow errors in the mail pipeline. A dropped message is unrecoverable — the OTK was consumed, the session advanced, and the plaintext is gone. Silent loss is worse than a visible error.
- **OTK/pre-key uploads MUST verify device ownership.** Before accepting key material, the server must confirm `req.user` owns the target device. Without this check, an attacker can inject their own OTKs into another user's device key bundle and intercept incoming messages — a man-in-the-middle on the encryption layer. This directly violates the guarantee that the server cannot impersonate users.
- **Never add server-side access control that builds a social graph.** Device listing (`GET /user/:id/devices`) must remain open to all authenticated users — X3DH requires it. File downloads should rely on client-side encryption, not server-side ACLs that track who accesses what. User search returns public profiles and must not be gated by contact lists. See `docs/server/architecture.md` → "Security Invariants" for the full rationale.
- **Never log or store IP addresses or User-Agent strings.** This is a hard privacy requirement from the vex.wtf privacy policy — not a default Express/Node behaviour, so it must be actively suppressed in middleware and request logging.

## Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work atomically
bd close <id>         # Complete work
bd sync               # Sync with git
```

## Non-Interactive Shell Commands

**ALWAYS use non-interactive flags** with file operations to avoid hanging on confirmation prompts.

Shell commands like `cp`, `mv`, and `rm` may be aliased to include `-i` (interactive) mode on some systems, causing the agent to hang indefinitely waiting for y/n input.

**Use these forms instead:**
```bash
# Force overwrite without prompting
cp -f source dest           # NOT: cp source dest
mv -f source dest           # NOT: mv source dest
rm -f file                  # NOT: rm file

# For recursive operations
rm -rf directory            # NOT: rm -r directory
cp -rf source dest          # NOT: cp -r source dest
```

**Other commands that may prompt:**
- `scp` - use `-o BatchMode=yes` for non-interactive
- `ssh` - use `-o BatchMode=yes` to fail instead of prompting
- `apt-get` - use `-y` flag
- `brew` - use `HOMEBREW_NO_AUTO_UPDATE=1` env var

<!-- BEGIN BEADS INTEGRATION -->
## Issue Tracking with bd (beads)

**IMPORTANT**: This project uses **bd (beads)** for ALL issue tracking. Do NOT use markdown TODOs, task lists, or other tracking methods.

### Why bd?

- Dependency-aware: Track blockers and relationships between issues
- Git-friendly: Auto-syncs to JSONL for version control
- Agent-optimized: JSON output, ready work detection, discovered-from links
- Prevents duplicate tracking systems and confusion

### Quick Start

**Check for ready work:**

```bash
bd ready --json
```

**Create new issues:**

```bash
bd create "Issue title" --description="Detailed context" -t bug|feature|task -p 0-4 --json
bd create "Issue title" --description="What this issue is about" -p 1 --deps discovered-from:bd-123 --json
```

**Claim and update:**

```bash
bd update <id> --claim --json
bd update bd-42 --priority 1 --json
```

**Complete work:**

```bash
bd close bd-42 --reason "Completed" --json
```

### Issue Types

- `bug` - Something broken
- `feature` - New functionality
- `task` - Work item (tests, docs, refactoring)
- `epic` - Large feature with subtasks
- `chore` - Maintenance (dependencies, tooling)

### Priorities

- `0` - Critical (security, data loss, broken builds)
- `1` - High (major features, important bugs)
- `2` - Medium (default, nice-to-have)
- `3` - Low (polish, optimization)
- `4` - Backlog (future ideas)

### Workflow for AI Agents

1. **Check ready work**: `bd ready` shows unblocked issues
2. **Claim your task atomically**: `bd update <id> --claim`
3. **Work on it**: Implement, test, document
4. **Discover new work?** Create linked issue:
   - `bd create "Found bug" --description="Details about what was found" -p 1 --deps discovered-from:<parent-id>`
5. **Complete**: `bd close <id> --reason "Done"`

### Auto-Sync

bd automatically syncs with git:

- Exports to `.beads/issues.jsonl` after changes (5s debounce)
- Imports from JSONL when newer (e.g., after `git pull`)
- No manual export/import needed!

### Important Rules

- ✅ Use bd for ALL task tracking
- ✅ Always use `--json` flag for programmatic use
- ✅ Link discovered work with `discovered-from` dependencies
- ✅ Check `bd ready` before asking "what should I work on?"
- ❌ Do NOT create markdown TODO lists
- ❌ Do NOT use external issue trackers
- ❌ Do NOT duplicate tracking systems

For more details, see README.md.

## Documentation Standards

When writing or updating docs, follow these principles:

### Diátaxis classification

Every doc should be primarily one of four types. Don't mix them — if a doc needs both a how-to and a reference section, consider splitting.

| Type | Question it answers | Style |
|------|--------------------|----|
| **Tutorial** | "Can you teach me to do X?" | Learning-oriented, step-by-step, hand-holding |
| **How-to** | "How do I accomplish X?" | Task-oriented, assumes knowledge, goal-directed |
| **Reference** | "What are the details of X?" | Information-oriented, complete, structured |
| **Explanation** | "Why does X work this way?" | Understanding-oriented, contextual, discursive |

Our current docs are strong on **Reference** and **Explanation**. When adding new docs, prefer **How-to** format for anything operational.

**Exception: `docs/ops/`** — The ops folder is the strategy layer and intentionally breaks Diátaxis norms. Journeys, roadmaps, and story maps are not tutorials, how-tos, references, or explanations — they are **planning artifacts** that answer "What are users doing?", "What's broken?", and "What do we build next?". They live in their own folder with their own structure (see `docs/ops/README.md`). Don't try to force them into a Diátaxis type. The ops folder is the bridge between user research and Linear issues — it exists so that engineering decisions trace back to user needs, not just technical intuition.

### Structure rules

- **One h1 per file.** It's the doc title.
- **Never skip heading levels.** h1 → h2 → h3. No h1 → h3 jumps.
- **Keep docs under 300 lines.** If a doc grows past this, split it into a hub + detail files (see `packages.md` and `journeys.md` for the pattern).
- **Every doc must be linked from README.md's Documentation table.** No orphan docs — if it's not in the index, it doesn't exist.
- **Cross-link related docs.** Use "See also" references: `See [architecture.md](docs/server/architecture.md) for layer rules.`
- **Define terms locally on first use, but don't build a glossary into every doc.** Central glossary lives in `docs/glossary.md`.

### What NOT to do

- Don't add docs for one-time decisions. Use `bd decision` or commit messages instead.
- Don't duplicate AGENTS.md rules in other docs. Reference this file.
- Don't write docs for code that doesn't exist yet. Document what's shipped.
- Don't add comments like `<!-- TODO: ... -->` in docs. Create a bead instead.

## Git Workflow

**NEVER commit or push directly.** The user always reviews and commits manually.

When work on a bead is complete:
1. Run quality gates (tests, type-check)
2. Run `git status` to summarise what changed
3. Stop — tell the user what files are ready to review
4. **Wait for the user to confirm they have reviewed and committed**
5. Only THEN close the bead with `bd close`

Do NOT run `git add`, `git commit`, `git push`, or `git stash` under any circumstances.
Do NOT close a bead until the user has explicitly confirmed the commit.

<!-- END BEADS INTEGRATION -->
