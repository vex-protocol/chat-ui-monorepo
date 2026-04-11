# ADR-012: Supply Chain Security Posture

**Status:** Accepted
**Date:** 2026-04-09
**Deciders:** @dream
**Supersedes:** None

---

## Context

On March 31, 2026, the `axios` npm package was compromised via credential theft.
North Korean state actors published a malicious version that added
`plain-crypto-js` as a dependency — a typosquat of `crypto-js` containing a
Remote Access Trojan delivered via a `postinstall` hook. The RAT exfiltrated
environment variables (including `NPM_TOKEN`) and established a reverse shell.

The attack succeeded despite axios having:
- OIDC provenance configured (but a classic `NPM_TOKEN` was also set, and npm
  defaults to tokens over OIDC when both exist)
- CI/CD pipeline (but the stolen token allowed direct `npm publish`, bypassing CI)
- Millions of weekly downloads (popularity provides no security guarantee)

Vex Chat depends on packages in the same ecosystem. As a privacy-first E2E
encrypted chat platform, a supply chain compromise would be catastrophic — an
attacker could exfiltrate device private keys, intercept plaintext messages
before encryption, or inject backdoored crypto primitives.

### Threat model

| Threat | Vector | Historical example |
|--------|--------|--------------------|
| Credential theft → malicious publish | Stolen npm token, phishing | axios (2026), ua-parser-js (2021) |
| Social engineering → maintainer transfer | New maintainer adds malware | event-stream (2018) |
| Typosquatting | Install look-alike package | `plain-crypto-js` (2026), `crossenv` (2017) |
| Install script attack | `postinstall` runs arbitrary code | `plain-crypto-js` RAT (2026) |
| Maintainer self-sabotage | Author deletes or corrupts code | colors.js / faker.js (2022) |
| Protestware | Author adds political payload | node-ipc (2022) |
| Lockfile manipulation | PR changes resolved URLs | Theoretical, prevented by lockfile-lint |
| CI workflow injection | Malicious GHA step or compromised action | codecov-action (2021) |

---

## Decision

Adopt a defense-in-depth security posture across all five repositories
(types-js, crypto-js, libvex-js, spire, vex-chat). No single control is
sufficient — each layer catches threats the others miss.

### Layer 1: Repository security

**Signed commits.** All commits to `master` must be SSH-signed. Enforced via
branch protection. Developers configure `gpg.format = ssh` with their
`id_ed25519` key.

**Branch protection on `master`:**
- Require PR reviews (minimum 1)
- Dismiss stale reviews on new pushes
- Require signed commits
- Require linear history
- Require status checks to pass
- No force pushes, no branch deletion

**CODEOWNERS.** `* @vex-protocol/core` on all files. Crypto paths get explicit
double coverage.

**GitHub security features (all free for public repos):**
- Dependabot alerts + security updates + version updates
- Secret scanning + push protection
- Private vulnerability reporting

### Layer 2: CI workflow hardening

**Pin all GitHub Actions to SHA, not tags.** Tags are mutable — a compromised
action can republish the same tag pointing to malicious code. SHA pins are
immutable. Dependabot auto-updates pinned SHAs when new versions release.

```yaml
# Immutable reference
- uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683  # v4.2.2
```

**StepSecurity harden-runner.** First step in every CI job. Starts in `audit`
mode (logs all outbound network), graduates to `block` mode with an explicit
egress allowlist (`github.com`, `registry.npmjs.org`, sigstore endpoints).

**Minimal workflow permissions.** Default: `contents: read`. Escalate per-job
only as needed (`id-token: write` for OIDC publishing, `security-events: write`
for CodeQL uploads).

**`--ignore-scripts` on CI installs.** Blocks `postinstall` hooks from executing
during `pnpm install`. Trusted build scripts are run explicitly after install.
This directly prevents the axios-style RAT delivery vector.

### Layer 3: Dependency scanning (three tools, three threat classes)

| Tool | What it catches | What it misses | Privacy |
|------|----------------|----------------|---------|
| `npm audit` | Known CVEs from advisory DB | Zero-days, malware, typosquats | Fully local |
| Socket CLI | Malware, typosquats, install scripts, obfuscation, unexpected network/filesystem access | Known CVEs (complementary to npm audit) | Sends only manifests, never source |
| `lockfile-lint` | Lockfile manipulation, non-HTTPS sources, registry swaps | Everything else | Fully local |

All three run in CI on every PR. A failure in any layer blocks merge.

### Layer 4: Publishing security

**OIDC-only publishing.** Packages are published from GitHub Actions using OIDC
trusted publishing (`id-token: write`). No `NPM_TOKEN` or `NODE_AUTH_TOKEN`
environment variable is ever set in CI.

This is the critical lesson from the axios attack: when both OIDC and a classic
token exist, npm defaults to the token. The token can be stolen and used to
publish from anywhere. OIDC-only means packages can **only** be published from
a verified GitHub Actions workflow run.

```yaml
- run: npm publish --provenance --access public
  # No NPM_TOKEN set — npm falls back to OIDC
```

**npm 2FA required on all published packages:**
```bash
npm access 2fa-required @vex-chat/types
npm access 2fa-required @vex-chat/crypto
npm access 2fa-required @vex-chat/libvex
```

**Provenance attestations.** `--provenance` flag generates a Sigstore-signed
attestation linking each published version to the exact commit, workflow, and
runner that built it. Consumers can verify provenance via `npm audit signatures`.

### Layer 5: Static analysis

**CodeQL.** Runs on push to master, on PRs, and weekly. Scans JavaScript and
TypeScript for common vulnerability patterns (injection, XSS, path traversal).

**OpenSSF Scorecard.** Runs on push to master and weekly. Evaluates repository
security posture against industry benchmarks. Results uploaded to GitHub
Security tab via SARIF.

---

## Operational rules

1. **Never set `NPM_TOKEN` in CI.** If a workflow needs to publish, use
   `id-token: write` and OIDC. No exceptions.
2. **Never use `actions/checkout@v4`** (or any unpinned tag). Always pin to SHA.
3. **Never run `pnpm install` in CI without `--ignore-scripts`.** Run trusted
   build steps explicitly.
4. **Review Dependabot PRs before merge.** Auto-merge is disabled. Version
   bumps in dependencies warrant a changelog review.
5. **Rotate granular npm tokens** (for local dev publishing to verdaccio) every
   90 days.

---

## Consequences

### Positive

- **Defense in depth.** No single compromised tool or credential can lead to a
  malicious publish. OIDC-only publishing is the strongest single control.
- **Free.** All tools (CodeQL, Scorecard, Dependabot, Socket free tier,
  lockfile-lint, harden-runner audit mode) are free for public repos.
- **Proactive, not reactive.** Socket's behavioral analysis and lockfile-lint
  catch threats before CVEs are assigned — the axios RAT had no CVE at the
  time of the attack.

### Negative

- **CI is slower.** Three scanning steps add ~2-3 minutes to each PR check.
  Acceptable for security.
- **SHA pinning is noisy.** Dependabot PRs for action updates are frequent.
  Grouped updates reduce PR volume.
- **`--ignore-scripts` breaks some packages.** Packages that rely on
  `postinstall` for native compilation (e.g., `better-sqlite3`) need explicit
  `pnpm rebuild` steps in CI. Documented in per-repo CI configs.

---

## References

- [axios supply chain attack postmortem (March 2026)](https://socket.dev/blog/axios-compromise) — the triggering incident
- [event-stream incident (2018)](https://blog.npmjs.org/post/180565383195/details-about-the-event-stream-incident)
- [ua-parser-js compromise (2021)](https://github.com/nicedoc/ua-parser-js/issues/536)
- [colors.js / faker.js self-sabotage (2022)](https://snyk.io/blog/open-source-npm-packages-colors-faker/)
- [node-ipc protestware (2022)](https://snyk.io/blog/peacenotwar-malicious-npm-node-ipc-package-vulnerability/)
- [npm OIDC trusted publishing](https://docs.npmjs.com/generating-provenance-statements)
- [OpenSSF Scorecard](https://securityscorecards.dev/)
- [StepSecurity harden-runner](https://github.com/step-security/harden-runner)
- [Socket.dev](https://socket.dev/)
