# ADR-002: AGPL v3 licensing with selective publishing to protect competitive advantage

## Status

Proposed

## Context

Vex is a privacy-first encrypted messenger funded by community donations (crypto wallet). The project needs to be open enough to earn trust — especially for `packages/crypto/` and `packages/libvex/` — while protecting the operational and architectural knowledge that constitutes our competitive advantage.

**The AI-era threat model:**

1. **Low-effort cloning.** AI coding assistants (Copilot, Cursor, Claude) make it trivially cheap for a competitor to rewrite or rebrand an open source project. GitClear's 2025 research shows code duplication grew from 8.3% to 12.3% of changed lines since AI assistants went mainstream — an 8x increase in blocks with 5+ duplicated lines during 2024 alone.

2. **AI training on public code.** Any code published to GitHub is ingested into training datasets. GitHub's `.github/copilot-ignore` only covers GitHub's own AI products — not third-party scrapers (Anthropic, Meta, etc.). `robots.txt` is ineffective; crawlers use Git APIs and HTTPS raw endpoints, not web scraping. Once code is in a training dataset, there is no mechanism to "un-train" a model.

3. **License enforcement against AI is untested.** The Doe v. GitHub class action (filed 2022) survives on breach-of-contract and open-source license violation claims as of February 2026, but no court has ruled on whether training an LLM on licensed code constitutes a license violation. There is no precedent.

4. **Code is not the moat.** Experienced open source practitioners (Apache Foundation, Greylock, Signal, Matrix) consistently argue that competitive advantage lies in community, operational knowledge, velocity, and trust — not source code. Architecture docs, ops runbooks, test suites (which reveal edge cases and security posture), and CI/CD configs leak far more competitive advantage than the code itself.

**Constraints:**

- Donation-funded (crypto wallet) — no enterprise tier, no dual licensing, no CLA
- Crypto community expects auditable source code, especially for cryptographic primitives
- Every serious encrypted messenger in the space uses AGPL or GPL (Signal, Matrix/Element, Briar, Session)
- Three-person team (CTO, CEO/original implementer, designer) — workflow overhead must be minimal

**Options considered:**

| License | Pros | Cons |
|---------|------|------|
| **MIT/Apache 2.0** | Maximum adoption, zero friction | Anyone can fork, rebrand, and compete. No copyleft protection. |
| **FSL (Functional Source License)** | Prevents competing products for 2 years, converts to MIT/Apache | Not OSI-approved "open source." Crypto community associates "source available" with corporate interests. Sentry, Codecov, and VC-backed SaaS companies use FSL — wrong signal for a donation-funded project. |
| **BSL (Business Source License)** | Configurable restrictions, used by HashiCorp/CockroachDB | Same "source available" stigma. Requires defining "Additional Use Grant." Converts after 3-4 years. Overkill without an enterprise business model. |
| **AGPL v3** | True open source. Strong copyleft — any fork must also be AGPL. Signal, Matrix, Briar use it. Crypto community trusts it. | Does not prevent AI training. Permissive enough that someone could fork and compete (but must publish their changes). |
| **GPL v3 + NoAI clause** | Adds explicit AI training prohibition | NoAI clauses are not OSI-approved. Enforceability is unproven. Combining with GPL may create license compatibility issues. |

## Decision

### 1. License all published code under AGPL v3

AGPL v3 for everything that reaches the public repository. This:

- Forces any fork to publish modifications under the same terms — prevents proprietary forks
- Extends copyleft to server-side use (AGPL's network clause) — a competitor running a modified Vex server must publish their changes
- Matches the licensing convention of every major encrypted messenger (Signal, Matrix/Element, Briar, Session)
- Maximizes trust with the crypto community, who expect true open source for security-critical software

### 2. Selectively publish a subset of the monorepo

Maintain the full monorepo privately. Publish only the code that users and contributors need:

**Published (public GitHub mirror):**

```
packages/libvex/       # Client SDK — must be auditable
packages/crypto/       # Cryptographic primitives — must be auditable
packages/types/        # Protocol type definitions
packages/store/        # State management
packages/ui/           # UI component library
apps/desktop/src/      # Desktop client source
apps/mobile/src/       # Mobile client source
README.md
LICENSE                # AGPL v3
package.json
tsconfig.json
pnpm-workspace.yaml
```

**Kept private:**

```
docs/architecture/     # ADRs, design decisions — reveals strategic intent
docs/ops/              # Operational runbooks — reveals infrastructure
.github/workflows/     # CI/CD pipelines — reveals deployment topology
.agents/               # AI agent skill definitions
.claude/               # Claude Code configuration and skills
.beads/                # Issue tracker state
AGENTS.md              # AI agent role definitions
apps/spire/            # Server implementation (publish later, see below)
apps/spire/test/       # Server tests — reveals edge cases, security assumptions
```

### 3. Defer publishing the server (apps/spire/)

The server is the most sensitive component. Publishing it immediately would reveal:

- Rate limiting thresholds and abuse detection logic
- Database schema and migration history
- WebSocket connection management internals
- Permission enforcement implementation details

Publish `apps/spire/` once the project has an established community and the operational infrastructure is mature enough that knowing the implementation details no longer confers meaningful advantage to a competitor. The AGPL license is already chosen, so there is no legal barrier to publishing later — only a strategic timing decision.

### 4. Opt out of AI training where possible

- Add `.github/copilot-ignore` to the public repo (covers GitHub's own AI products)
- Acknowledge this does not prevent third-party scrapers and is not a substitute for the licensing and selective publishing decisions above

## Rationale

1. **AGPL over FSL/BSL because we're donation-funded.** FSL and BSL exist to protect VC-backed companies with enterprise revenue models. Their "source available" framing creates friction with the crypto community, who equate "open source" with trustworthiness. AGPL is the strongest copyleft license that is still true open source — it says "you can use and modify this freely, but you must share your modifications." This aligns perfectly with donation-funded, community-driven development.

2. **Selective publishing over full transparency because code is not the moat.** Our competitive advantage is operational knowledge: how to deploy, scale, and maintain a secure messaging service. Architecture decisions, ops runbooks, and test suites reveal this knowledge. The source code itself — the SDK, the crypto, the UI — is what the community needs to audit and trust. Publishing everything would give a competitor a complete operational playbook at no cost.

3. **Server deferred because it's the operational core.** The client SDK and crypto libraries are the trust surface — the community needs to verify that encryption is implemented correctly. The server is the operational surface — its implementation details (rate limits, abuse detection, connection management) are the hardest-won knowledge in the project and the easiest to exploit if published prematurely.

4. **AGPL's network clause is the key differentiator over GPL.** Standard GPL only triggers copyleft on distribution. AGPL extends this to network interaction: if someone runs a modified Vex server and lets users connect to it, they must publish their server source code. This prevents the "SaaS loophole" that undermines GPL for server software.

## Trade-offs

### What we're giving up

- **Server auditability.** Until `apps/spire/` is published, the community cannot audit the server. For an E2E encrypted messenger where the server never sees plaintext, this is acceptable — the security-critical code (key exchange, encryption, decryption) lives in `packages/crypto/` and `packages/libvex/`, which are public.

- **Contributions to private components.** Outside contributors cannot submit PRs against architecture docs, ops configs, or server tests. The three-person core team has full access to the private monorepo. If the team grows beyond the core three, revisit which private components should open up.

- **Sync workflow overhead.** Maintaining a private monorepo and a public subset requires tooling (splitsh-lite, Copybara, or a GitHub Action) to keep them in sync. This adds CI complexity.

- **Incomplete public build.** The public repo cannot build the full stack (missing `apps/spire/`). Contributors can build and run desktop/mobile clients against a running Vex server, but cannot stand up their own server from the public repo alone.

### Why this is acceptable

- The crypto and SDK packages — the trust surface — are fully public and auditable.
- AGPL ensures any fork must publish modifications, preventing silent proprietary forks.
- The sync overhead is manageable with splitsh-lite or a simple GitHub Action (Symfony maintains ~50 read-only mirrors with splitsh-lite).
- Publishing the server later is a one-way door — we can always open up, but cannot un-publish.

## Consequences

### Positive

- **Community trust.** AGPL v3 is the expected license for encrypted messengers. Publishing crypto and SDK code demonstrates there is nothing to hide in the security-critical path.
- **Fork protection.** AGPL's copyleft and network clause prevent proprietary forks and competing SaaS deployments based on our code without source disclosure.
- **Reduced AI training exposure.** Architecture docs, ops knowledge, and test suites — the highest-value competitive assets — never reach public repositories or AI training datasets.
- **Donation alignment.** Donors fund an open source project they can verify, not a "source available" product controlled by a company.

### Negative

- **"Why isn't the server open?"** Some community members will ask. The answer is straightforward: it will be, once the project is established. The security-critical code (everything the client does) is already open.
- **Contributor friction.** Contributors cannot run the full stack locally without a running Vex server. Need to provide a public test server or clear documentation for connecting to one.
- **License compatibility.** AGPL is incompatible with some permissive licenses in certain contexts. All dependencies must be checked for AGPL compatibility (MIT, Apache 2.0, BSD, ISC are all compatible).

### Mitigation

- Publish a clear `CONTRIBUTING.md` in the public repo explaining what is and isn't published, and why.
- Provide a public test server endpoint for contributors to develop against.
- Automate the private-to-public sync so it never drifts.
- Track AGPL compatibility of all dependencies via CI.

## Revisit Triggers

- **Server maturity.** Once the server's operational infrastructure (rate limiting, abuse detection, monitoring) is battle-tested and would not be trivially replicated from reading the source, publish `apps/spire/`.
- **Team grows beyond core three.** If new contributors need access to private components, consider expanding the public subset or granting private repo access to trusted contributors.
- **Legal precedent on AI training.** If courts rule on whether AGPL copyleft extends to AI model training, reassess whether additional licensing measures are needed.
- **Competitor forks emerge.** If someone forks and competes despite AGPL, evaluate whether the selective publishing strategy needs adjustment or whether community/velocity advantages are sufficient.
- **Donation model changes.** If the project moves to a different funding model (grants, sponsorship, paid hosting), revisit whether FSL or dual licensing makes more sense.
