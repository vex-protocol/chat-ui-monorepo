# Vex Protocol v3 — Implementation Plan

> Source: `vex-implementation-plan-2.pdf` (44 pages)
> Date: 2026-04-08
> Status: **DRAFT — awaiting review before creating beads issues**

---

## Decisions (Resolved)

| Decision | Answer |
|----------|--------|
| npm scope | Keep `@vex-chat/*` |
| GitHub org | `vex-protocol` (repos already there) |
| Branch strategy | Single mega-branch `protocol-specs` across all repos |
| Claude Code auto-changesets | Yes, include |
| Docker in CI | Available |
| Apple/Google signing creds | Not ready — defer Phase 5 |
| Phase order | Zod migration first, then changesets |
| Validation workflow | Verdaccio → validate in monorepo → merge → publish to npm |
| TokenScopes enum | `as const` object + `z.enum()` (see rationale below) |
| `ISuccessMsg` typo | Fix to `ISuccessMsg` (breaking rename — clean slate) |
| Spire Zod adoption | Yes — validate at trust boundary until protocol is rock solid |
| Version bumps | RC suffixes (e.g. `1.1.0-rc.0`) for verdaccio, real versions on merge |
| Uint8Array in schemas | Zod 4.1 `z.codec()` — hex string on wire, Uint8Array at runtime (see `RESEARCH_ZOD_BINARY_DATA.md`) |
| Types boundary | Wire/protocol types only in `@vex-chat/types`; crypto internals move to libvex |
| Import/code sorting | `eslint-plugin-perfectionist` recommended-natural (deterministic, minimal diffs) |
| Test linting | Lint tests with relaxed rules via separate config block (not ignored). tsconfig.build.json for emit. |
| ESLint plugins | `@vitest/eslint-plugin` (tests), `eslint-plugin-n` (spire), `eslint-plugin-perfectionist` (all repos) |
| Prettier vs lint | Separate CI checks: `lint` (ESLint) + `format:check` (Prettier). No `eslint-plugin-prettier`. |
| eslint-config-prettier | ^10.1 with `eslint-config-prettier/flat` import |
| License compliance | Enforce per-repo before moving to next repo |
| SBOM | Do NOT ship in npm package (consumers generate their own); generate as CI artifact |
| THIRD-PARTY-LICENSES | Do NOT ship (no major package does; misleading for libraries) |
| npm provenance | Yes — enable via OIDC trusted publishing + `--provenance` flag |
| Ship source .ts files | Yes — enables consumer auditing (follows @noble pattern) |

---

## Branch + Verdaccio Workflow

All work happens on `protocol-specs` branch in every repo. Nothing merges to master until validated end-to-end.

```
┌─────────────────────────────────────────────────────────────────┐
│                     protocol-specs branches                     │
│                                                                 │
│  types-js ──build──▶ verdaccio ──install:local──▶ crypto-js     │
│  crypto-js ─build──▶ verdaccio ──install:local──▶ libvex-js     │
│  libvex-js ─build──▶ verdaccio ──install:local──▶ spire         │
│  libvex-js ─build──▶ verdaccio ──install:local──▶ vex-chat/*    │
│                                                                 │
│  vex-chat apps build + run against local packages               │
│                                                                 │
│  ✅ All apps work? ──▶ Merge all repos to master (dependency    │
│                        order: types → crypto → libvex → spire)  │
│                                                                 │
│  After each merge to master:                                    │
│    1. npm publish (real registry)                                │
│    2. Update downstream repos' remaining feature branches        │
│       to use real npm versions (not verdaccio)                  │
│    3. Commit version update, merge to master                    │
│                                                                 │
│  Merge order:                                                   │
│    types-js   → master → npm publish @vex-chat/types@X.Y.Z     │
│    crypto-js  → master → npm publish @vex-chat/crypto@X.Y.Z    │
│    libvex-js  → master → npm publish @vex-chat/libvex@X.Y.Z    │
│    spire      → master (deployed, not published)                │
│    vex-chat   → master                                          │
└─────────────────────────────────────────────────────────────────┘
```

**Verdaccio commands (already exist in monorepo):**
- `pnpm registry` — start verdaccio on localhost:4873
- `pnpm publish:local` — build + publish types→crypto→libvex to verdaccio
- `pnpm publish:local types` — publish just one package
- `pnpm install:local spire` — install local packages into spire
- `pnpm install:local store` — install into packages/store
- `pnpm install:local desktop` — install into apps/desktop
- `pnpm install:local mobile` — install into apps/mobile

---

## Current State Audit

| Repo | Location | Changesets Installed | Changeset Config | Release Workflow | Zod | ESLint |
|------|----------|---------------------|-----------------|-----------------|-----|--------|
| `types-js` | `~/Public/types-js` | Yes (devDep) | **Missing** | Yes (`release.yml`) | **No** | Yes |
| `crypto-js` | `~/Public/crypto-js` | Yes (devDep) | **Missing** | **No** | **No** | Yes |
| `libvex-js` | `~/Public/libvex-js` | **No** | **Missing** | **No** | **No** | Yes |
| `spire` | `~/Public/spire` | **No** | **Missing** | **No** | **No** | Yes |
| `vex-chat` | `~/Public/vex-chat` | N/A (monorepo) | N/A | N/A | N/A | Yes |

---

## Supply Chain Security + Hardening (applies to every repo)

> Lessons from real npm attacks: event-stream (social engineering maintainer transfer),
> ua-parser-js (stolen npm credentials), colors.js (maintainer self-sabotage),
> node-ipc (protestware). Each repo gets hardened before feature work begins.

### GitHub Repository Security (per repo)

**1. Signed commits — enforce on `master`:**

SSH signing (recommended over GPG — simpler, same trust level):
```bash
# Each developer runs once:
git config --global gpg.format ssh
git config --global user.signingkey ~/.ssh/id_ed25519.pub
git config --global commit.gpgsign true
git config --global tag.gpgSign true
```

Enable GitHub vigilant mode: User Settings > SSH and GPG keys > "Flag unsigned commits as unverified."

**2. Branch protection on `master`:**

| Setting | Value |
|---------|-------|
| Require pull request reviews | Yes, minimum 1 reviewer |
| Dismiss stale reviews on new pushes | Yes |
| Require approval from someone other than last pusher | Yes |
| Require status checks to pass | Yes (CI build, tests, lint, license check) |
| Require branches to be up-to-date | Yes (strict) |
| Require signed commits | Yes |
| Require linear history | Yes |
| Require conversation resolution | Yes |
| Restrict who can push | Maintainers only |
| Do not allow force pushes | Yes |
| Do not allow deletions | Yes |

**3. CODEOWNERS file** (`.github/CODEOWNERS`):
```
# All files require core team review
* @vex-protocol/core

# Crypto code gets extra scrutiny
**/crypto/** @vex-protocol/core
**/encryption/** @vex-protocol/core
```

**4. Security policy** (`SECURITY.md`):
```markdown
# Security Policy

## Supported Versions
| Version | Supported |
|---------|-----------|
| 1.x     | Yes       |

## Reporting a Vulnerability
Report via GitHub's private vulnerability reporting on this repo's Security tab.
Do NOT create public issues for security vulnerabilities.
Expected response: 48 hours acknowledgment, 7 days initial assessment.
```

**5. Enable GitHub security features** (Settings > Code security):
- [x] Dependabot alerts — auto-notify on vulnerable deps
- [x] Dependabot security updates — auto-PR for vulnerable deps
- [x] Secret scanning — detects committed tokens/keys
- [x] Push protection — blocks pushes containing secrets
- [x] Private vulnerability reporting — researchers report privately

All free for public repos.

**6. Dependabot config** (`.github/dependabot.yml`):
```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    groups:
      production:
        dependency-type: "production"
      development:
        dependency-type: "development"
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
```

**7. CodeQL code scanning** (`.github/workflows/codeql.yml`):
```yaml
name: CodeQL
on:
  push:
    branches: [master]
  pull_request:
    branches: [master]
  schedule:
    - cron: '0 6 * * 1'
jobs:
  analyze:
    runs-on: ubuntu-latest
    permissions:
      actions: read
      contents: read
      security-events: write
    steps:
      - uses: actions/checkout@v4
      - uses: github/codeql-action/init@v3
        with:
          languages: javascript-typescript
      - uses: github/codeql-action/analyze@v3
```
Free for public repos.

**8. OpenSSF Scorecard** (`.github/workflows/scorecard.yml`):
```yaml
name: Scorecard
on:
  push:
    branches: [master]
  schedule:
    - cron: '0 6 * * 1'
jobs:
  analysis:
    runs-on: ubuntu-latest
    permissions:
      security-events: write
      id-token: write
    steps:
      - uses: actions/checkout@v4
      - uses: ossf/scorecard-action@v2
        with:
          results_file: results.sarif
          results_format: sarif
      - uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: results.sarif
```
Add badge to README: `[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/vex-protocol/types-js/badge)](https://scorecard.dev/viewer/?uri=github.com/vex-protocol/types-js)`

### CI Workflow Hardening (per repo)

**9. Pin ALL GitHub Actions to SHA** (not tags — tags are mutable):
```yaml
# BAD — tag can be moved to malicious commit
- uses: actions/checkout@v4

# GOOD — immutable commit reference
- uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683  # v4.2.2
```

Automate initial conversion: `npx @step-security/secure-repo`

Dependabot auto-updates pinned SHAs when new versions release (via the `github-actions` ecosystem in dependabot.yml above).

**10. StepSecurity harden-runner** (first step in every job):
```yaml
steps:
  - name: Harden Runner
    uses: step-security/harden-runner@v2
    with:
      egress-policy: audit  # Start with audit, move to block after baseline
  - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683
  # ... rest of steps
```

In audit mode: logs all outbound network connections, establishes baseline.
After baseline: switch to `block` mode with explicit allowlist:
```yaml
    with:
      egress-policy: block
      allowed-endpoints: >
        github.com:443
        registry.npmjs.org:443
        api.npmjs.org:443
        fulcio.sigstore.dev:443
        rekor.sigstore.dev:443
```

Free for public repos (audit mode).

**11. Restrict default workflow permissions:**

In each repo: Settings > Actions > General > Workflow permissions > "Read repository contents and packages permissions"

In workflows, request only what's needed:
```yaml
permissions:
  contents: read  # default — only escalate per-job as needed
```

### npm Account Security

**12. Enforce 2FA for publishing:**
```bash
npm access 2fa-required @vex-chat/types
npm access 2fa-required @vex-chat/crypto
npm access 2fa-required @vex-chat/libvex
```

**13. Use granular access tokens** (not classic tokens):
- Scope to specific packages only
- Set read-write only for publishing
- Set expiration (30-90 days)
- Rotate regularly

**14. Dependency security scanning (3-layer defense):**

> **Why 3 layers?** The axios attack (March 31, 2026) proved that no single tool catches
> everything. The attacker injected a typosquat dep (`plain-crypto-js`) with a postinstall
> RAT — npm audit wouldn't have caught it (no CVE existed yet). Only behavioral analysis
> (Socket) and lockfile validation (lockfile-lint) add proactive protection.

**Layer 1 — `npm audit` (known CVEs, fully local, free):**
```yaml
- name: Security audit
  run: npm audit --audit-level=high
```
Catches known vulnerabilities from the advisory database. Does NOT detect malware, typosquatting, or install script attacks.

**Layer 2 — Socket CLI in CI (behavioral analysis, sends manifests only):**
```bash
pnpm add -D @socketsecurity/cli
```
```json
{
  "scripts": {
    "security:scan": "socket ci"
  }
}
```
```yaml
- name: Socket security scan
  env:
    SOCKET_SECURITY_API_TOKEN: ${{ secrets.SOCKET_TOKEN }}
  run: pnpm security:scan
```

What Socket catches that npm audit does NOT:
- Malware and typosquatting (e.g. `plain-crypto-js` masquerading as `crypto-js`)
- Install scripts (~94% of malicious npm packages use them)
- Obfuscated code
- Network access in packages that shouldn't have it
- Shell/filesystem access patterns

Privacy: sends only `package.json` + lockfile to Socket's API. Never sends source code.
Free tier: 1,000 scans/month, 3 members — sufficient for our repos.

**Layer 3 — `lockfile-lint` (lockfile integrity, fully local, free):**
```bash
pnpm add -D lockfile-lint
```
```json
{
  "scripts": {
    "security:lockfile": "lockfile-lint --path pnpm-lock.yaml --allowed-hosts npm pnpm --validate-https"
  }
}
```
Catches lockfile manipulation attacks where package sources are swapped in PRs. 100% local, zero cloud dependency, fast.

**15. OIDC-only publishing (no long-lived NPM_TOKEN):**

> **Axios lesson:** The project had OIDC provenance configured BUT also had a classic
> `NPM_TOKEN` env var. When both exist, npm defaults to the token, making OIDC useless.
> The attacker stole the token and published directly — bypassing CI entirely.
>
> **Fix:** Never set `NPM_TOKEN` in CI. Use OIDC-only trusted publishing. This means
> packages can ONLY be published from a verified GitHub Actions workflow, never from
> a stolen credential.

```yaml
# CORRECT — OIDC only, no NPM_TOKEN
- run: npm publish --provenance --access public
  # No NODE_AUTH_TOKEN / NPM_TOKEN set!
  # npm uses OIDC token from id-token: write permission
```

**16. `--ignore-scripts` in CI installs:**

The axios RAT was delivered via a `postinstall` hook in `plain-crypto-js`. Block this:
```yaml
- run: pnpm install --frozen-lockfile --ignore-scripts
```

Then explicitly run trusted build scripts. This prevents any dependency from executing arbitrary code during install.

### Per-Repo Security Checklist

Every repo must have all of these before feature work begins:

```
[ ] LICENSE file (AGPL-3.0 full text)
[ ] SECURITY.md (vulnerability reporting policy)
[ ] .github/dependabot.yml (npm + github-actions)
[ ] .github/workflows/codeql.yml
[ ] .github/workflows/scorecard.yml
[ ] Branch protection on master (signed commits, reviews, status checks)
[ ] All workflow actions pinned to SHA (npx @step-security/secure-repo)
[ ] harden-runner as first step in every workflow job
[ ] Default workflow permissions set to read-only
[ ] @onebeyond/license-checker in CI (license:check script)
[ ] npm audit --audit-level=high in CI
[ ] --ignore-scripts on CI installs
[ ] Secret scanning + push protection enabled
[ ] Dependabot alerts enabled
[ ] eslint-plugin-perfectionist recommended-natural
[ ] @vitest/eslint-plugin for test files (repos with tests)
[ ] eslint-config-prettier ^10.1 with /flat import
[ ] tsconfig.build.json (repos with tests — excludes __tests__ from emit)
[ ] Separate CI steps: lint + format:check
```

For published packages (types, crypto, libvex), additionally:
```
[ ] npm 2FA enforced for package (npm access 2fa-required)
[ ] OIDC-only publishing (NO NPM_TOKEN — only id-token: write)
[ ] Provenance enabled (--provenance in publish)
[ ] Source .ts files included in npm tarball
[ ] repository field in package.json
[ ] OpenSSF Scorecard badge in README
```

### Axios Attack Summary (March 31, 2026)

> For context on why these measures matter.

**What happened:** North Korean state-sponsored actors (Sapphire Sleet/UNC1069) socially
engineered the axios maintainer via a fake Slack workspace + fake Teams update, installing
a RAT on his machine. They stole npm credentials, changed his npm email to a ProtonMail
address, and published `axios@1.14.1` + `axios@0.30.4` with a typosquat dependency
(`plain-crypto-js`) containing a cross-platform RAT. Live for ~3 hours. ~100M weekly downloads.

**Root cause:** Classic `NPM_TOKEN` was available alongside OIDC credentials. npm defaulted
to the stolen token, bypassing provenance entirely.

**What would have prevented it:**
1. OIDC-only publishing (no `NPM_TOKEN`) — attacker can't publish without CI
2. `--ignore-scripts` in consumer CI — blocks postinstall RAT
3. Socket.dev scan — would flag the new `plain-crypto-js` typosquat dependency
4. lockfile-lint — would flag a new registry source
5. npm provenance verification by consumers — malicious versions had no provenance

**Your exposure:** libvex-js depends on `axios@^1.7.0`, lockfile resolves to `1.14.0` (safe).
The `^` range would have pulled `1.14.1` during the 3-hour window if `pnpm install` ran
without a lockfile. Using `--frozen-lockfile` in CI prevents this.

---

## TypeScript Strictness + Quality Enforcement (applies to every repo)

> Every repo gets maximum TypeScript strictness and CI-enforced quality gates.
> Make each repo strict before moving to the next.

### Maximum Strictness tsconfig.json

Based on what the strictest projects use (zod, Effect, @noble/curves), plus TS 6.0 defaults:

```json
{
  "compilerOptions": {
    // --- Strict core (TS 6.0 default) ---
    "strict": true,

    // --- Beyond strict (not included in strict: true) ---
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noPropertyAccessFromIndexSignature": true,
    "noImplicitOverride": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "allowUnusedLabels": false,
    "allowUnreachableCode": false,
    "noUnusedLocals": true,
    "noUnusedParameters": true,

    // --- Module safety ---
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "erasableSyntaxOnly": true,
    "isolatedDeclarations": true,
    "forceConsistentCasingInFileNames": true,

    // --- Module resolution ---
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "moduleDetection": "force",
    "target": "es2022",
    "lib": ["es2022"],

    // --- Output ---
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "dist",
    "rootDir": "src",

    // --- Performance ---
    "skipLibCheck": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

**Key flags beyond `strict: true`:**

| Flag | What it catches | Who uses it |
|------|----------------|-------------|
| `noUncheckedIndexedAccess` | `arr[0]` could be `undefined` — forces null check | @tsconfig/strictest |
| `exactOptionalPropertyTypes` | `foo?: string` means absent OR string, not `string \| undefined` | zod, Effect |
| `erasableSyntaxOnly` | Errors on enums/namespaces (can't type-strip) | @noble/curves |
| `isolatedDeclarations` | Forces explicit return types for fast .d.ts generation | @noble/curves |
| `verbatimModuleSyntax` | Forces `import type` for type-only imports | @noble/curves, zod |

### Type Coverage — Enforce Near-100%

**Tool: `type-coverage`** — traverses every identifier and checks if its type is `any`.

```bash
pnpm add -D type-coverage
```

```json
{
  "typeCoverage": {
    "atLeast": 99,
    "strict": true,
    "ignoreCatch": true,
    "cache": true,
    "ignoreFiles": ["**/*.test.ts", "**/*.spec.ts"]
  },
  "scripts": {
    "type-coverage": "type-coverage"
  }
}
```

**`--strict` mode** counts these as uncovered (not just bare `any`):
- `Promise<any>`, `Record<string, any>` — any nested inside generics
- `value as SomeType` — type assertions
- `value!` — non-null assertions
- `Object` and `{}` types

CI enforcement:
```yaml
- name: Type Coverage
  run: npx type-coverage --at-least 99 --strict --ignore-catch
```

### ESLint — Strictest TypeScript Config

> **`eslint-plugin-total-functions` is dead.** Last real commit Aug 2024, doesn't support
> ESLint 9 flat config, pinned to typescript-eslint v5 (we need v8), doesn't support TS 6.x.
> Its key rule `no-unsafe-type-assertion` was absorbed into typescript-eslint v8.15 as
> `@typescript-eslint/no-unsafe-type-assertion`. Its `no-enums` is covered by
> `erasableSyntaxOnly` in TS 6.x. The remaining unique rules (readonly-mutable assignment,
> partial division) are too niche to justify a dead dependency.

```javascript
// eslint.config.js
import tseslint from 'typescript-eslint'

export default tseslint.config(
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // --- Beyond the strictTypeChecked preset ---
      '@typescript-eslint/no-unsafe-type-assertion': 'error',
      '@typescript-eslint/strict-boolean-expressions': ['error', {
        allowString: false,
        allowNumber: false,
        allowNullableObject: false,
      }],
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', {
        prefer: 'type-imports',
        fixStyle: 'inline-type-imports',
      }],
      '@typescript-eslint/consistent-type-exports': 'error',
      '@typescript-eslint/explicit-function-return-type': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/no-import-type-side-effects': 'error',
      '@typescript-eslint/prefer-readonly': 'error',
      '@typescript-eslint/require-array-sort-compare': 'error',
    },
  },
)
```

The `strictTypeChecked` preset gives 68 rules including `no-floating-promises`,
`no-unnecessary-condition`, `use-unknown-in-catch-callback-variable`, `no-misused-promises`,
and `no-unsafe-enum-comparison`. Adding `no-unsafe-type-assertion` on top covers the main
gap that total-functions originally filled.

### Library Quality Checks (CI)

```yaml
# .github/workflows/type-quality.yml
name: Type Quality
on: [pull_request, push]
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 24, cache: pnpm }
      - run: pnpm install --frozen-lockfile --ignore-scripts

      # 1. Type check
      - name: Type Check
        run: pnpm tsc --noEmit

      # 2. Lint (type-aware)
      - name: ESLint
        run: pnpm lint

      # 3. Type coverage (fail if below threshold)
      - name: Type Coverage
        run: npx type-coverage --at-least 99 --strict --ignore-catch

      # 4. Type-level tests (published packages only)
      - name: Type Tests
        run: npx tsd

      # 5. Package exports correctness
      - name: publint
        run: npx publint --strict

      # 6. Type resolution across CJS/ESM/bundler
      - name: Are The Types Wrong?
        run: npx @arethetypeswrong/cli --pack .

      # 7. API surface regression detection
      - name: API Extractor
        run: npx api-extractor run --local --verbose
```

**What each tool catches:**

| Tool | What it catches |
|------|----------------|
| `tsc --noEmit` | All type errors |
| ESLint `strictTypeChecked` + `total-functions` | Unsafe patterns, dead code, partial functions, `any` leaks |
| `type-coverage --at-least 99 --strict` | Implicit `any` creep, type assertion abuse |
| `tsd` | Wrong public API types, breaking type changes |
| `publint --strict` | Broken package.json exports/main/types fields |
| `@arethetypeswrong/cli` | CJS/ESM resolution mismatches, types that work in dev but break for consumers |
| `api-extractor` | Accidental API surface changes (committed report diffs in PRs) |

### Required devDependencies (per repo — exact versions, no ranges)

```json
{
  "devDependencies": {
    "typescript": "6.0.2",
    "eslint": "9.27.0",
    "typescript-eslint": "8.32.1",
    "type-coverage": "2.29.7",
    "tsd": "0.33.0",
    "publint": "0.3.18",
    "@arethetypeswrong/cli": "0.18.2",
    "@microsoft/api-extractor": "7.58.1",
    "license-checker-rspack-2": "1.3.1",
    "@socketsecurity/cli": "1.1.78",
    "lockfile-lint": "4.14.0",
    "syncpack": "14.2.1",
    "npm-package-json-lint": "8.0.0"
  }
}
```

> **All versions are pinned (no `^` or `~`).** This is enforced via `.npmrc` + syncpack.

### Dependency Pinning + Version Consistency

**1. Pin all dependencies — split approach (`.npmrc` is gitignored for verdaccio):**

The verdaccio workflow writes scoped registry + auth lines to `.npmrc` in every repo,
so `.npmrc` must stay gitignored. Instead, enforce pinning via CI + developer setup:

**CI enforcement (the real gate):**
```yaml
# In every CI workflow:
env:
  npm_config_save_exact: "true"
```

Both npm and pnpm respect `npm_config_save_exact` as an environment variable.
pnpm also reads `.npmrc` `save-exact=true` natively — same file, same setting.

**Developer setup (one-time, per machine):**
```bash
# npm repos (types-js, crypto-js, libvex-js, spire):
npm config set save-exact true      # writes to ~/.npmrc

# pnpm repo (vex-chat) — pnpm also reads ~/.npmrc:
# same command works, OR:
pnpm config set save-exact true
```

This means `npm install zod` writes `"zod": "3.24.4"` not `"zod": "^3.24.4"`.
Same for `pnpm add zod`.

**CI lint catches anything that slips through:**
`npm-package-json-lint` (sibling repos) and `syncpack lint` (monorepo) error on
any `^` or `~` in package.json — regardless of how the dep was added.

**`engines` in package.json (committed, always enforced):**
```json
{
  "engines": { "node": ">=24.0.0", "npm": ">=10.0.0" }
}
```

Engine strictness is enforced by npm when `engine-strict=true` is in the user's
`~/.npmrc`. In CI, set `npm_config_engine_strict=true` as an env var.

**2. Enforce pinning in CI — `syncpack` (for vex-chat monorepo):**
```json
// .syncpackrc.json
{
  "semverGroups": [
    {
      "label": "All deps must be exact (no ^, ~, >=)",
      "range": "",
      "dependencyTypes": ["prod", "dev", "peer"],
      "dependencies": ["**"],
      "packages": ["**"]
    }
  ],
  "versionGroups": [
    {
      "label": "Use workspace protocol for internal packages",
      "dependencies": ["@vex-chat/**"],
      "dependencyTypes": ["prod", "dev"],
      "pinVersion": "workspace:*"
    }
  ]
}
```

```yaml
- name: Check dependency pinning
  run: npx syncpack lint
```

**3. Enforce pinning in sibling repos — `npm-package-json-lint`:**
```json
// .npmpackagejsonlintrc.json (in types-js, crypto-js, libvex-js, spire)
{
  "rules": {
    "prefer-absolute-version-dependencies": "error",
    "prefer-absolute-version-devDependencies": "error"
  }
}
```

```yaml
- name: Lint package.json
  run: npx npm-package-json-lint .
```

**4. Sync tool versions across repos — `.mise.toml`:**
```toml
# Same file in every repo
[tools]
node = "24.0.0"
```

Use Renovate with a shared config preset to keep TypeScript/ESLint/Prettier versions
in lockstep across repos (grouped PRs for "core tooling" updates).

### Package Manager Enforcement (no corepack)

> `.npmrc` is gitignored (verdaccio writes to it). Pinning and engine strictness
> are enforced via CI env vars + `npm-package-json-lint` / `syncpack`. See above.

**Sibling repos (types-js, crypto-js, libvex-js, spire) — enforce npm:**
```json
{
  "scripts": {
    "preinstall": "npx only-allow npm"
  },
  "engines": {
    "node": ">=24.0.0",
    "npm": ">=10.0.0"
  },
  "packageManager": "npm@10.9.2"
}
```

`.gitignore` (prevent wrong lockfile commits + verdaccio artifacts):
```gitignore
pnpm-lock.yaml
yarn.lock
.npmrc
```

**vex-chat monorepo — enforce pnpm (already set up, harden):**
```json
{
  "scripts": {
    "preinstall": "npx only-allow pnpm"
  },
  "engines": {
    "node": ">=24.0.0",
    "pnpm": ">=10.0.0"
  },
  "packageManager": "pnpm@10.30.3"
}
```

`.gitignore` (already present):
```gitignore
package-lock.json
yarn.lock
.npmrc
```

Remove all `^` from `pnpm-workspace.yaml` catalog entries.

### README Badges (per repo)

Based on what top TypeScript projects ship (checked: zod, axios, tRPC, hono, @noble/curves, Effect, Prisma, vitest):

**Standard set for every `@vex-chat/*` package:**

```markdown
[![npm version](https://img.shields.io/npm/v/@vex-chat/types)](https://www.npmjs.com/package/@vex-chat/types)
[![npm downloads](https://img.shields.io/npm/dm/@vex-chat/types)](https://www.npmjs.com/package/@vex-chat/types)
[![CI](https://github.com/vex-protocol/types-js/actions/workflows/ci.yml/badge.svg)](https://github.com/vex-protocol/types-js/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/npm/types/@vex-chat/types)](https://www.npmjs.com/package/@vex-chat/types)
[![License](https://img.shields.io/npm/l/@vex-chat/types)](https://github.com/vex-protocol/types-js/blob/master/LICENSE)
[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/vex-protocol/types-js/badge)](https://scorecard.dev/viewer/?uri=github.com/vex-protocol/types-js)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/@vex-chat/types)](https://bundlephobia.com/package/@vex-chat/types)
```

**Badge frequency across top TS projects:**

| Badge | How many of 10 projects have it |
|-------|-------------------------------|
| npm version | 6/10 |
| npm downloads | 6/10 |
| License | 6/10 |
| CI status | 4/10 |
| Code coverage | 3/10 |
| Bundle size | 3/10 |
| TypeScript types | 0/10 (all TS projects, none bother with badge) |
| OpenSSF Scorecard | 0/10 (we'd be ahead of the curve) |

### Per-Repo TypeScript + Tooling Quality Checklist

```
[ ] tsconfig.json uses maximum strictness (all flags above)
[ ] ESLint uses strictTypeChecked + no-unsafe-type-assertion
[ ] type-coverage at 99%+ in CI (--strict --ignore-catch)
[ ] tsd type-level tests for public API (published packages)
[ ] publint passes (package.json exports correctness)
[ ] @arethetypeswrong/cli passes (CJS/ESM resolution)
[ ] api-extractor report committed (API surface tracking)
[ ] README badges added (npm version, downloads, CI, TS, license, scorecard, bundle size)
[ ] All quality checks in CI workflow
[ ] CI env vars set: npm_config_save_exact=true, npm_config_engine_strict=true
[ ] All deps pinned to exact versions (no ^ or ~)
[ ] syncpack lint passes (monorepo) or npm-package-json-lint passes (sibling repos)
[ ] .npmrc gitignored (verdaccio writes to it)
[ ] Package manager enforced (only-allow + engines + packageManager field)
[ ] Wrong lockfiles in .gitignore
[ ] .mise.toml with node version matching all other repos
[ ] Same TypeScript, ESLint, Prettier versions as other repos
```

---

## License Compliance + Publishing Standards (applies to every repo)

> From `vex-license-compliance.pdf`. Each repo must be fully compliant before
> moving to the next phase. This is NOT a separate phase — it's a gate on every repo.

### Per-Repo Compliance Checklist

Every repo (`types-js`, `crypto-js`, `libvex-js`, `spire`, `vex-chat`) must pass this before its phase work is considered done:

**1. License field in package.json:**
```json
{ "license": "AGPL-3.0-or-later" }
```

**2. LICENSE file present** at repo root (AGPL-3.0 full text).

**3. Install `license-checker-rspack-2` (devDep) and add scripts:**
```json
{
  "scripts": {
    "license:check": "license-checker-rspack-2 --onlyAllow 'MIT;ISC;BSD-2-Clause;BSD-3-Clause;Apache-2.0;0BSD;MPL-2.0;CC0-1.0;CC-BY-4.0;Unlicense;BlueOak-1.0.0;Python-2.0;LGPL-2.1-only;LGPL-2.1-or-later;LGPL-3.0-only;LGPL-3.0-or-later;GPL-2.0-only;GPL-2.0-or-later;GPL-3.0-only;GPL-3.0-or-later;AGPL-3.0-only;AGPL-3.0-or-later;Artistic-2.0;Zlib;PSF-2.0' --production --excludePrivatePackages",
    "license:unknown": "license-checker-rspack-2 --production --unknown"
  }
}
```

**4. Run `pnpm license:check`** — must pass with zero violations.

**5. Run `pnpm license:unknown`** — investigate and resolve any unknowns.

**6. Add to CI workflow (build.yml):**
```yaml
- name: Check dependency licenses
  run: pnpm license:check
```

### Published Packages Only (types, crypto, libvex)

**7. Enable npm provenance** in release workflow:
```yaml
- run: npm publish --provenance --access public
  env:
    NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```
Requires `permissions: { id-token: write }` on the job. Provenance links every published version to its exact source commit and CI workflow via Sigstore. ~12% of npm packages have this; @noble/curves, zod, and axios all do. This is the single highest-value trust signal for a crypto library.

**8. Ship source TypeScript files** in the npm tarball:
```json
{
  "files": ["dist", "src", "LICENSE"]
}
```
Enables consumers to audit the actual source they're running. @noble/curves does this.

**9. Set `repository` field** in package.json (required for provenance):
```json
{
  "repository": {
    "type": "git",
    "url": "https://github.com/vex-protocol/types-js.git"
  }
}
```

### What NOT to Ship

| Artifact | Ship in npm? | Why |
|----------|-------------|-----|
| SBOM (CycloneDX/SPDX) | **No** | Library SBOMs are misleading — the actual dep tree depends on the consumer's lockfile. Consumers run `npm sbom` themselves. Generate as CI artifact for your own records. |
| THIRD-PARTY-LICENSES | **No** | No major package ships this (checked: zod, axios, express, @noble/curves). Dependencies are declared in package.json — consumers install them and see their licenses directly. |
| CHANGELOG.md | Optional | Commit to git, don't need it in the tarball. npm shows the GitHub releases page. |
| SECURITY.md | In git only | Stays in repo for GitHub's security tab, not in npm tarball. |

### CI Artifact: SBOM for Internal Records

Generate SBOMs in CI for your own compliance auditing, but don't ship them:
```yaml
- name: Generate SBOM (internal record)
  run: npx @cyclonedx/cyclonedx-npm --output-file sbom.json
- uses: actions/upload-artifact@v4
  with:
    name: sbom
    path: sbom.json
```

### Compliance Enforcement Order

```
types-js:  compliance gate ──▶ Phase 1 (Zod migration)
crypto-js: compliance gate ──▶ Phase 2 (codec)  
libvex-js: compliance gate ──▶ Phase 2 (codec + SDK types)
spire:     compliance gate ──▶ Phase 5 (contract testing)
vex-chat:  compliance gate ──▶ Phase 6 (app CI/CD)
```

Each repo is fully compliant (license check passing in CI) before any feature work begins on it.

---

## Phase 1: Zod Migration + Type Safety (types-js)

> Do this FIRST — everything else depends on Zod schemas existing.

**Repo:** `types-js` on `protocol-specs` branch
**Goal:** Replace all hand-written interfaces/enums with Zod schemas. Export both schemas (runtime) and types (zero-cost `z.infer`).

### Step 1.1: Install Zod + Restructure Source

Add `zod` as a dependency (not devDep — consumers need it for runtime validation).

Split `src/index.ts` (289 lines) into domain files:

```
types-js/src/
  schemas/
    common.ts        # TokenScopes, IActionToken, hexBytes() codec
    users.ts         # IUser, IUserRecord, IDevice
    servers.ts       # IServer, IChannel, IPermission, IInvite
    files.ts         # IFilePayload, IFileResponse, IFileSQL, IEmoji
    messages.ts      # IBaseMsg, ISuccessMsg, IErrMsg, IChallMsg, IRespMsg,
                     # IReceiptMsg, IResourceMsg, INotifyMsg, IMailWS, IMailSQL
    keys.ts          # IKeyBundle, IPreKeysWS, IPreKeysSQL (wire + shared storage)
  index.ts           # Re-exports everything
```

**Removed from types-js (moved to libvex-js):**
```
libvex-js/src/types/
  crypto.ts          # IXKeyRing, IPreKeysCrypto, ISessionCrypto (SDK-internal)
  storage.ts         # ISessionSQL, IIdentityKeys (SDK-only persistence)
  identity.ts        # StoredCredentials, KeyStore (SDK credential contract)
```

**Also remove from types-js:**
- `tweetnacl` devDependency + peerDependency — only used for `nacl.BoxKeyPair` type
  in `IXKeyRing` and `IPreKeysCrypto`, which are moving to libvex
- When moved to libvex, inline the `BoxKeyPair` shape instead of importing from tweetnacl:
  ```typescript
  // libvex-js/src/types/crypto.ts
  // Inline the shape — don't couple to tweetnacl's types
  // (future: WASM ADR will replace tweetnacl entirely)
  interface KeyPair {
    publicKey: Uint8Array
    secretKey: Uint8Array
  }

  export interface IXKeyRing {
    identityKeys: KeyPair
    ephemeralKeys: KeyPair
    preKeys: IPreKeysCrypto
  }

  export interface IPreKeysCrypto {
    keyPair: KeyPair
    signature: Uint8Array
    index?: number
  }
  ```
  This keeps the same shape so consumers don't break, but removes the
  tweetnacl type import. When WASM migration happens, only this file changes.

> **Boundary rule:** `@vex-chat/types` contains ONLY types that cross the network
> boundary between client and server, or are used by both sides. The litmus test:
> "Does this type appear in data sent over HTTP/WebSocket, or is it used by both
> spire and libvex for the same purpose?" If no → it stays local to the repo.

### Step 1.2: Migrate Each Type to Zod Schema

Full migration table — every type in the current `src/index.ts`:

**`hexBytes()` codec (`schemas/common.ts`):**

> **Binary data strategy:** Wire types with binary fields use `hexBytes()` codec
> (Zod 4.1) — hex string on wire, Uint8Array at runtime. Memory-only crypto types
> (IXKeyRing, IPreKeysCrypto, ISessionCrypto) moved to libvex-js; they use plain
> `z.instanceof(Uint8Array)`. See `RESEARCH_ZOD_BINARY_DATA.md` for full rationale.

```typescript
import { z } from 'zod/v4'

/** Zod codec: hex string on the wire ↔ Uint8Array at runtime. */
export function hexBytes(opts?: { length?: number; description?: string }) {
  const pattern = opts?.length
    ? new RegExp(`^[0-9a-f]{${opts.length * 2}}$`)
    : /^[0-9a-f]+$/
  return z.codec(
    z.string().regex(pattern).describe(opts?.description ?? 'Hex-encoded binary data'),
    z.instanceof(Uint8Array),
    {
      decode: (hex: string) => { /* hex→Uint8Array */ },
      encode: (bytes: Uint8Array) => { /* Uint8Array→hex */ },
    }
  )
}
```

**Common types (`schemas/common.ts`):**

> **Enum strategy:** Use `as const` objects (not TS `enum` keyword). Rationale:
> - TS team is steering away from runtime enums (`--erasableSyntaxOnly` in TS 5.8 errors on enums)
> - Zod 4 deprecated `z.nativeEnum()` in favor of `z.enum()` with const objects
> - `as const` objects are 3x smaller, fully tree-shakeable (no IIFEs)
> - Same `TokenScopes.Register` access pattern — no consumer code changes
> - Better OpenAPI spec generation support
> - Wire format unchanged (same numeric values)

```typescript
/** Token scope for action tokens. */
export const TokenScopes = {
  Register: 0,
  File: 1,
  Avatar: 2,
  Device: 3,
  Invite: 4,
  Emoji: 5,
  Connect: 6,
} as const
export type TokenScopes = (typeof TokenScopes)[keyof typeof TokenScopes]
// => 0 | 1 | 2 | 3 | 4 | 5 | 6

/** Zod schema for TokenScopes validation. */
export const tokenScopesSchema = z.enum(TokenScopes)

/** Action token for scoped operations. */
export const actionToken = z.object({
  key: z.string().describe('Token value'),
  time: z.date().describe('Token creation time'),
  scope: tokenScopesSchema.describe('Token scope'),
}).describe('Scoped action token with TTL')
export type IActionToken = z.infer<typeof actionToken>
```

**User types (`schemas/users.ts`):**
```typescript
/** Public user profile. */
export const user = z.object({
  userID: z.string().describe('Unique user identifier'),
  username: z.string().describe('Display username'),
  lastSeen: z.date().describe('Last activity timestamp'),
}).describe('Public user profile')
export type IUser = z.infer<typeof user>

/** Database user record with auth fields. */
export const userRecord = user.extend({
  passwordHash: z.string().describe('PBKDF2-SHA512 password hash'),
  passwordSalt: z.string().describe('Password salt'),
}).describe('Database user record with password hash')
export type IUserRecord = z.infer<typeof userRecord>

/** Device record for multi-device support. */
export const device = z.object({
  deviceID: z.string().describe('Unique device identifier'),
  owner: z.string().describe('Owner user ID'),
  signKey: z.string().describe('Ed25519 signing public key (hex)'),
  name: z.string().describe('Device display name'),
  lastLogin: z.date().describe('Last login timestamp'),
  deleted: z.boolean().describe('Soft-delete flag'),
}).describe('Device registration record')
export type IDevice = z.infer<typeof device>
```

**Server types (`schemas/servers.ts`):**
```typescript
export const server = z.object({
  serverID: z.string().describe('Unique server identifier'),
  name: z.string().describe('Server display name'),
  icon: z.string().optional().describe('Server icon file ID'),
}).describe('Chat server')
export type IServer = z.infer<typeof server>

export const channel = z.object({
  channelID: z.string().describe('Unique channel identifier'),
  serverID: z.string().describe('Parent server ID'),
  name: z.string().describe('Channel display name'),
}).describe('Server channel')
export type IChannel = z.infer<typeof channel>

export const permission = z.object({
  permissionID: z.string().describe('Unique permission identifier'),
  userID: z.string().describe('Grantee user ID'),
  resourceID: z.string().describe('Resource being accessed'),
  resourceType: z.string().describe('Resource type (e.g. "server")'),
  powerLevel: z.number().describe('Permission level (0-100)'),
}).describe('Permission grant')
export type IPermission = z.infer<typeof permission>

export const invite = z.object({
  inviteID: z.string().describe('Unique invite identifier'),
  serverID: z.string().describe('Target server ID'),
  owner: z.string().describe('Inviter user ID'),
  expiration: z.string().describe('Expiration datetime'),
}).describe('Server invitation')
export type IInvite = z.infer<typeof invite>
```

**File types (`schemas/files.ts`):**
```typescript
export const filePayload = z.object({
  owner: z.string().describe('File owner user ID'),
  data: z.instanceof(Uint8Array).describe('Signed file data'),
  nonce: z.string().describe('Encryption nonce (hex)'),
  fileID: z.string().optional().describe('Optional file ID for updates'),
}).describe('File upload payload')
export type IFilePayload = z.infer<typeof filePayload>

export const fileResponse = z.object({
  fileID: z.string().describe('File identifier'),
  owner: z.string().describe('File owner'),
  nonce: z.string().describe('Encryption nonce'),
  data: z.instanceof(Uint8Array).optional().describe('File binary data'),
}).describe('File response with metadata')
export type IFileResponse = z.infer<typeof fileResponse>

export const fileSQL = z.object({
  fileID: z.string().describe('File identifier'),
  owner: z.string().describe('File owner user ID'),
  nonce: z.string().describe('Unique nonce identifier'),
}).describe('File database record')
export type IFileSQL = z.infer<typeof fileSQL>

export const emoji = z.object({
  emojiID: z.string().describe('Emoji identifier'),
  owner: z.string().describe('Server ID that owns this emoji'),
  name: z.string().describe('Emoji display name'),
}).describe('Custom server emoji')
export type IEmoji = z.infer<typeof emoji>
```

**Message types (`schemas/messages.ts`):**
```typescript
export const socketAuthErrors = z.enum([
  'BadSignature', 'InvalidToken', 'UserNotRegistered'
]).describe('WebSocket authentication error codes')
export type SocketAuthErrors = z.infer<typeof socketAuthErrors>

export const mailType = z.enum(['initial', 'subsequent'])
  .describe('Mail type: initial (X3DH) or subsequent (ratchet)')
export type MailType = z.infer<typeof mailType>

/** Base WebSocket message. */
export const baseMsg = z.object({
  transmissionID: z.string().describe('Unique transmission identifier'),
  type: z.string().describe('Message type discriminator'),
}).describe('Base WebSocket message')
export type IBaseMsg = z.infer<typeof baseMsg>

/** Success response. */
export const successMsg = baseMsg.extend({
  data: z.unknown().describe('Response payload'),
  timestamp: z.number().optional().describe('Server timestamp'),
}).describe('Success response message')
export type ISuccessMsg = z.infer<typeof successMsg>

/** Error response. */
export const errMsg = baseMsg.extend({
  error: z.string().describe('Error message'),
  data: z.unknown().optional().describe('Error context'),
}).describe('Error response message')
export type IErrMsg = z.infer<typeof errMsg>

/** Auth challenge. */
export const challMsg = z.object({
  challenge: z.instanceof(Uint8Array).describe('Challenge nonce bytes'),
}).describe('Authentication challenge')
export type IChallMsg = z.infer<typeof challMsg>

/** Auth response. */
export const respMsg = z.object({
  response: z.instanceof(Uint8Array).describe('Signed response bytes'),
}).describe('Authentication response')
export type IRespMsg = z.infer<typeof respMsg>

/** Mail receipt acknowledgment. */
export const receiptMsg = z.object({
  nonce: z.string().describe('Mail nonce being acknowledged'),
}).describe('Mail receipt')
export type IReceiptMsg = z.infer<typeof receiptMsg>

/** Resource CRUD message. */
export const resourceMsg = baseMsg.extend({
  resourceType: z.string().describe('Resource type'),
  action: z.enum(['CREATE', 'RETRIEVE', 'UPDATE', 'DELETE']).describe('CRUD action'),
  data: z.unknown().optional().describe('Resource payload'),
}).describe('Resource operation message')
export type IResourceMsg = z.infer<typeof resourceMsg>

/** Server notification. */
export const notifyMsg = baseMsg.extend({
  event: z.string().describe('Notification event type'),
  data: z.unknown().optional().describe('Event payload'),
}).describe('Server notification')
export type INotifyMsg = z.infer<typeof notifyMsg>

/** Key bundle for X3DH session establishment. */
export const keyBundle = z.object({
  signKey: z.string().describe('Ed25519 signing public key (hex)'),
  preKey: z.object({
    publicKey: z.string().describe('X25519 pre-key (hex)'),
    signature: z.string().describe('Pre-key signature (hex)'),
    index: z.number().describe('Pre-key index'),
  }),
  oneTimeKey: z.object({
    publicKey: z.string().describe('X25519 OTK (hex)'),
    signature: z.string().describe('OTK signature (hex)'),
    index: z.number().describe('OTK index'),
  }).optional().describe('One-time key (consumed after use)'),
}).describe('X3DH key bundle for session establishment')
export type IKeyBundle = z.infer<typeof keyBundle>

/** WebSocket pre-key format. */
export const preKeysWS = z.object({
  deviceID: z.string().describe('Device identifier'),
  publicKey: z.string().describe('Pre-key public key (hex)'),
  signature: z.string().describe('Pre-key signature (hex)'),
  index: z.number().describe('Pre-key index'),
}).describe('WebSocket pre-key payload')
export type IPreKeysWS = z.infer<typeof preKeysWS>

/** Encrypted mail message (WebSocket format). */
// cipher, nonce, extra use hexBytes() codec: hex on wire, Uint8Array at runtime
export const mailWS = z.object({
  mailID: z.string().describe('Unique mail identifier'),
  mailType: z.number().describe('Mail type (0=initial, 1=subsequent)'),
  sender: z.string().describe('Sender device ID'),
  recipient: z.string().describe('Recipient device ID'),
  cipher: hexBytes({ description: 'Encrypted message content' }),
  nonce: hexBytes({ length: 24, description: 'Encryption nonce' }),
  extra: hexBytes({ description: 'Extra metadata' }).optional(),
  group: z.string().nullable().describe('Channel ID for group messages'),
  forward: z.boolean().describe('Whether this is a multi-device forward'),
  authorID: z.string().describe('Original author user ID'),
  readerID: z.string().describe('Intended reader user ID'),
}).describe('Encrypted mail message')
export type IMailWS = z.infer<typeof mailWS>

/** Mail message (SQL/database format). */
export const mailSQL = z.object({
  mailID: z.string().describe('Mail identifier'),
  header: z.string().describe('Message header (hex)'),
  sender: z.string().describe('Sender device ID'),
  recipient: z.string().describe('Recipient device ID'),
  cipher: z.string().describe('Encrypted content (hex)'),
  nonce: z.string().describe('Encryption nonce (hex)'),
  extra: z.string().optional().describe('Extra metadata (hex)'),
  group: z.string().nullable().describe('Channel ID for group messages'),
  mailType: z.number().describe('Mail type'),
  time: z.date().describe('Server timestamp'),
  forward: z.boolean().describe('Multi-device forward flag'),
  authorID: z.string().describe('Original author user ID'),
  readerID: z.string().describe('Intended reader user ID'),
}).describe('Mail database record')
export type IMailSQL = z.infer<typeof mailSQL>

/** Device registration payload. */
export const devicePayload = z.object({
  username: z.string().describe('Account username'),
  signKey: z.string().describe('Ed25519 public signing key (hex)'),
  deviceName: z.string().describe('Device display name'),
}).describe('Device registration payload')
export type IDevicePayload = z.infer<typeof devicePayload>

/** User registration payload. */
export const registrationPayload = devicePayload.extend({
  password: z.string().describe('Account password'),
}).describe('User registration payload')
export type IRegistrationPayload = z.infer<typeof registrationPayload>
```

**Identity types — MOVED to `libvex-js/src/types/identity.ts`:**

`StoredCredentials` and `KeyStore` are SDK-only contracts (spire never imports them).
They stay in libvex and are re-exported from its public API for app consumers.

**Shared storage types (`schemas/keys.ts`):**

`IPreKeysSQL` stays in types (used by both spire and libvex for pre-key storage).
`ISessionSQL` and `IIdentityKeys` move to libvex (only SDK persists sessions/identity keys).

```typescript
export const preKeysSQL = z.object({
  keyID: z.string(), userID: z.string(), deviceID: z.string(),
  index: z.number(), privateKey: z.string().optional(),
  publicKey: z.string(), signature: z.string(),
}).describe('Pre-key database record')
export type IPreKeysSQL = z.infer<typeof preKeysSQL>
```

### Step 1.3: Update `index.ts` Re-Exports

```typescript
// Schemas (runtime validation)
export {
  hexBytes,
  tokenScopesSchema, actionToken,
  user, userRecord, device,
  server, channel, permission, invite,
  filePayload, fileResponse, fileSQL, emoji,
  baseMsg, successMsg, errMsg, challMsg, respMsg,
  receiptMsg, resourceMsg, notifyMsg,
  keyBundle, preKeysWS, preKeysSQL, mailWS, mailSQL,
  socketAuthErrors, mailType,
  devicePayload, registrationPayload,
} from './schemas/index.js'

// Const objects (runtime values)
export { TokenScopes, SocketAuthErrors, MailType } from './schemas/index.js'

// Types (zero-cost, used everywhere)
export type {
  TokenScopes, IActionToken,
  IUser, IUserRecord, IDevice,
  IServer, IChannel, IPermission, IInvite,
  IFilePayload, IFileResponse, IFileSQL, IEmoji,
  IBaseMsg, ISuccessMsg, IErrMsg, IChallMsg, IRespMsg,
  IReceiptMsg, IResourceMsg, INotifyMsg,
  IKeyBundle, IPreKeysWS, IPreKeysSQL, IMailWS, IMailSQL,
  SocketAuthErrors as SocketAuthErrorsType, MailType as MailTypeType,
  IDevicePayload, IRegistrationPayload,
} from './schemas/index.js'
```

**Not exported from types (moved to libvex):**
- `IXKeyRing`, `IPreKeysCrypto`, `ISessionCrypto` — SDK crypto internals
- `ISessionSQL`, `IIdentityKeys` — SDK-only storage
- `StoredCredentials`, `KeyStore` — SDK credential contract

### Step 1.4: Verify Downstream Compatibility

After migration, confirm that `crypto-js`, `libvex-js`, and `spire` all still compile with `import type { ... } from '@vex-chat/types'`. The type names are unchanged — only the source changed from `interface` to `z.infer<typeof>`.

**Validation steps:**
1. Bump types-js version (e.g. `1.1.0-rc.0`)
2. `pnpm publish:local types`
3. `pnpm install:local crypto` → `cd ../crypto-js && pnpm build`
4. `pnpm install:local libvex` → `cd ../libvex-js && pnpm build`
5. `pnpm install:local spire` → `cd ../spire && pnpm build`
6. `pnpm install:local store && pnpm install:local desktop && pnpm install:local mobile`
7. Run vex-chat apps — do they work?

### Step 1.5: Add Strict ESLint to Types

Install: `eslint-plugin-zod`, `eslint-plugin-tsdoc`, `eslint-plugin-jsdoc`

Update `eslint.config.js` with `strictTypeChecked`, TSDoc enforcement, `as`-ban, and `z.infer` nudging (see PDF for full config).

### Step 1.6: Add Quality Tools to Types CI

Add to `.github/workflows/build.yml`:
```yaml
- run: npx api-extractor run --local
- run: npx publint
- run: npx @arethetypeswrong/cli .
- run: npx knip
```

### Step 1.7: Enforce Wire-Only Type Boundary

Three layers of enforcement to prevent internal types from creeping back into `@vex-chat/types`:

**Layer 1: `api-extractor` with committed API report (types-js CI)**

`api-extractor` generates an `etc/vex-chat-types.api.md` file listing every public export. This file gets committed to git. Any new export shows up as a diff in PR review — reviewers can ask "does this type cross the wire?"

```json
// types-js/api-extractor.json
{
  "apiReport": {
    "enabled": true,
    "reportFolder": "./etc/"
  },
  "docModel": { "enabled": false }
}
```

CI step: `npx api-extractor run --local` fails if the report is stale → forces the developer to regenerate and commit it, making the API surface change visible in the PR.

**Layer 2: `.describe()` requirement (types-js ESLint)**

Every exported schema in `@vex-chat/types` MUST have `.describe()` because wire types need it for OpenAPI/AsyncAPI spec generation. If you can't write a `.describe()` that makes sense for an API spec, the type probably doesn't belong here.

Enforce with a custom ESLint rule or a CI script:
```bash
# scripts/check-describe.ts — fails if any exported z.object() lacks .describe()
# Run in CI after build
```

**Layer 3: Cross-repo export audit (CI script)**

`knip` is excellent (10.9k stars, 5M weekly downloads, multiple releases per week) but **only works within a single project**. It builds a module graph from files on disk — it can't see across separate Git repos. Since our repos are separate, knip inside `types-js` would flag every export as unused because nothing *within that repo* imports them.

Instead, a simple CI script in the **vex-chat monorepo** (which has access to all repos as siblings) audits cross-repo usage:

```bash
#!/usr/bin/env bash
# scripts/audit-types-usage.sh
# Run from vex-chat root. Reports which @vex-chat/types exports
# are used by which consumers.

TYPES_EXPORTS=$(cd ../types-js && grep -oP 'export (type |const |function |interface )\K\w+' src/index.ts | sort)
LIBVEX_IMPORTS=$(grep -rohP "import.*?{([^}]+)}.*?from ['\"]@vex-chat/types['\"]" ../libvex-js/src/ | grep -oP '\w+' | sort -u)
SPIRE_IMPORTS=$(grep -rohP "import.*?{([^}]+)}.*?from ['\"]@vex-chat/types['\"]" ../spire/src/ | grep -oP '\w+' | sort -u)

echo "=== Exports only used by libvex (candidates for moving) ==="
comm -23 <(comm -12 <(echo "$TYPES_EXPORTS") <(echo "$LIBVEX_IMPORTS")) <(echo "$SPIRE_IMPORTS")

echo "=== Exports not used by anyone ==="
comm -23 <(echo "$TYPES_EXPORTS") <(sort -u <(echo "$LIBVEX_IMPORTS") <(echo "$SPIRE_IMPORTS"))
```

This flags:
- Exports used by only one consumer → candidate for moving out
- Exports used by nobody → dead code, remove

**Summary of enforcement:**

| Layer | Tool | Where | What it catches |
|-------|------|-------|-----------------|
| API surface visibility | `api-extractor` | types-js CI | New exports require explicit PR review via committed report |
| Wire type requirement | `.describe()` check | types-js CI | Types without spec descriptions don't belong |
| Cross-repo usage audit | `audit-types-usage.sh` | vex-chat CI | Exports used by only one consumer or nobody |

---

## Phase 2: Codec Factory + SDK Type Safety (libvex-js)

**Repo:** `libvex-js` on `protocol-specs` branch
**Depends on:** Phase 1 (needs Zod schemas from types)

### Step 2.1: Add `createCodec()` Factory

Create `src/codec.ts`:
```typescript
import type { z } from 'zod'
import { decode, encode } from 'msgpackr'

export function createCodec<T extends z.ZodType>(schema: T) {
  type Msg = z.infer<T>
  return {
    decode: (data: Uint8Array): Msg => decode(data) as Msg,
    encode: (msg: Msg): Uint8Array => encode(msg),
    decodeSafe: (data: Uint8Array): Msg => schema.parse(decode(data)),
    encodeSafe: (msg: Msg): Uint8Array => { schema.parse(msg); return encode(msg) },
  }
}
```

Usage:
- **Spire** (trust boundary): `codec.decodeSafe(incomingData)` — validates
- **SDK/Apps** (trusted internal): `codec.decode(data)` — fast, typed, no Zod overhead

### Step 2.2: Wire Codec into Client.ts

Replace raw `decode()/encode()` calls in `Client.ts` with codec instances:
```typescript
import { mailWS, resourceMsg } from '@vex-chat/types'
const MailCodec = createCodec(mailWS)
const ResourceCodec = createCodec(resourceMsg)
```

### Step 2.3: Add ESLint `as`-ban + TSDoc to libvex

- `@typescript-eslint/consistent-type-assertions: never` — ban `as` outside codec
- `jsdoc/require-jsdoc` on public API exports

### Step 2.4: Add fast-check Round-Trip Tests

```typescript
import fc from 'fast-check'
import { ZodFastCheck } from 'zod-fast-check'
import { mailWS } from '@vex-chat/types'
import { createCodec } from '../src/codec'

const MailCodec = createCodec(mailWS)
const arb = ZodFastCheck().inputOf(mailWS)

test('mail messages round-trip through msgpack', () => {
  fc.assert(fc.property(arb, (msg) => {
    const encoded = MailCodec.encodeSafe(msg)
    const decoded = MailCodec.decodeSafe(encoded)
    expect(decoded).toEqual(msg)
  }))
})
```

### Step 2.5: Add Quality Tools to libvex CI

Same as types: api-extractor, publint, attw, plus `pnpm tsd` for type-level tests.

### Step 2.6: Validate via Verdaccio

1. Bump libvex version (e.g. `1.2.0-rc.0`)
2. `pnpm publish:local libvex`
3. `pnpm install:local store && pnpm install:local desktop && pnpm install:local mobile`
4. Run desktop and mobile apps — verify messaging still works

---

## Phase 3: Changesets + Publishing

> Now that types and libvex compile, add the release automation.

**Repos:** `types-js`, `crypto-js`, `libvex-js`

### Step 3.1: Add Changeset Config

For each repo, create `.changeset/config.json`:
```json
{
  "$schema": "https://unpkg.com/@changesets/config@3.1.1/schema.json",
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "fixed": [],
  "linked": [],
  "access": "public",
  "baseBranch": "master",
  "updateInternalDependencies": "patch",
  "ignore": []
}
```

Install `@changesets/cli` in libvex (types + crypto already have it).

### Step 3.2: Add `changeset status` CI Check

Update each repo's `.github/workflows/build.yml`:
```yaml
- name: Check for changeset
  run: pnpm changeset status --since=origin/master
```

Requires `fetch-depth: 0` on checkout.

### Step 3.3: Add `release.yml` Per Repo

For `crypto-js` and `libvex-js` (types already has one — verify it matches):
```yaml
name: Release
on:
  push:
    branches: [master]
concurrency: ${{ github.workflow }}-${{ github.ref }}
jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
      id-token: write
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 24, cache: pnpm, registry-url: 'https://registry.npmjs.org' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - run: pnpm license:check
      - id: changesets
        uses: changesets/action@v1
        with:
          publish: pnpm changeset publish --provenance --access public
          title: 'chore: version packages'
          commit: 'chore: version packages'
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      # Generate SBOM as CI artifact (not shipped in package)
      - name: Generate SBOM
        if: steps.changesets.outputs.published == 'true'
        run: npx @cyclonedx/cyclonedx-npm --output-file sbom.json
      - uses: actions/upload-artifact@v4
        if: steps.changesets.outputs.published == 'true'
        with:
          name: sbom-${{ github.sha }}
          path: sbom.json
```

**Manual steps (you do):**
- Set up OIDC Trusted Publishing on npmjs.com for each `@vex-chat/*` package
- GitHub org: `vex-protocol`, repos: `types`, `crypto-js`, `libvex-js`
- Workflow: `release.yml`
- Ensure `repository` field in each package.json points to the correct GitHub repo

### Step 3.4: Claude Code Action Auto-Changeset

Create `.github/workflows/auto-changeset.yml` per published repo:
```yaml
name: Auto Changeset
on:
  pull_request:
    types: [opened, synchronize]
jobs:
  generate-changeset:
    if: |
      github.event.pull_request.user.type != 'Bot' &&
      !startsWith(github.event.pull_request.title, 'chore: version packages')
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
          ref: ${{ github.head_ref }}
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 24, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - name: Check existing changeset
        id: check
        run: |
          if pnpm changeset status --since=origin/master 2>/dev/null; then
            echo "exists=true" >> $GITHUB_OUTPUT
          else
            echo "exists=false" >> $GITHUB_OUTPUT
          fi
      - name: Generate changeset with Claude
        if: steps.check.outputs.exists == 'false'
        uses: anthropics/claude-code-action@v1
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          prompt: |
            You are a release engineer. Analyze the git diff of this PR and generate
            a changeset file for the @changesets/cli tool.

            Instructions:
            1. Run `git diff origin/master...HEAD` to see all changes
            2. Read package.json for the package name
            3. Determine semver bump: patch (bugfix), minor (feature), major (breaking)
            4. Write a 1-3 sentence user-facing summary (impact, not implementation)
            5. Create the changeset file and commit it
          allowed_tools: "Bash(git diff:*),Bash(git add:*),Bash(git commit:*),Bash(cat:*),Read,Write"
```

**Manual step (you do):** Add `ANTHROPIC_API_KEY` secret to each repo.

### Step 3.5: Install Changeset Bot

**Manual step (you do):** Install changeset-bot GitHub App on `vex-protocol` org.

---

## Phase 4: Protocol Specs (OpenAPI + AsyncAPI)

**Repo:** `types-js` on `protocol-specs` branch
**Depends on:** Phase 1 (Zod schemas)

### Step 4.1: Generate OpenAPI from Zod

Create `types-js/scripts/generate-openapi.ts`:
- Uses `zod-to-openapi` to convert REST-facing schemas
- Maps every Spire HTTP endpoint (40+ routes) to OpenAPI operations
- Outputs `openapi.json` committed to repo

Add scripts:
```json
"openapi": "tsx scripts/generate-openapi.ts",
"postbuild": "pnpm specs"
```

### Step 4.2: Generate AsyncAPI from Zod

Create `types-js/scripts/generate-asyncapi.ts`:
- Uses `zod-to-json-schema` for each WS message discriminated union member
- Assembles AsyncAPI 3.0 document
- Outputs `asyncapi.json` committed to repo

WS message types to cover (from Spire ClientManager.ts):
- Client→Server: auth, challenge, response, resource, receipt, ping
- Server→Client: challenge, authorized, authErr, success, error, notify, ping, pong

### Step 4.3: Drift Detection

```json
"specs": "pnpm openapi && pnpm asyncapi",
"specs:check": "pnpm specs && git diff --exit-code openapi.json asyncapi.json"
```

Add to CI — fails if schemas changed but specs weren't regenerated.

### Step 4.4: Lint Both Specs

- `vacuum lint openapi.json -d` — OpenAPI quality
- `npx @stoplight/spectral-cli lint asyncapi.json --ruleset .spectral.yaml` — AsyncAPI quality
- `tsx scripts/validate-asyncapi.ts` — structural validation with `@asyncapi/parser`

### Step 4.5: Ship Specs in npm Packages

Update `types-js/package.json`:
```json
"files": ["dist", "openapi.json", "asyncapi.json"],
"exports": {
  ".": { "types": "./dist/index.d.ts", "import": "./dist/index.mjs" },
  "./openapi.json": "./openapi.json",
  "./asyncapi.json": "./asyncapi.json"
}
```

Update libvex build to copy specs into its npm package too.

### Step 4.6: Spire Serves Specs Live

Update Spire to serve the generated specs:
```typescript
import { generateOpenAPIDocument } from '@vex-chat/types'
import swaggerUi from 'swagger-ui-express'
app.use('/docs', swaggerUi.serve, swaggerUi.setup(generateOpenAPIDocument()))
app.get('/openapi.json', (_, res) => res.json(generateOpenAPIDocument()))
```

---

## Phase 5: Contract Testing

**Repos:** `libvex-js`, `spire`
**Depends on:** Phase 4 (specs must exist)

### Cost/Benefit Analysis

**Benefits:**
- Catches drift between spec and implementation at **runtime** (TypeScript only catches structure, not behavior)
- SDK integration tests don't need a running Spire instance (Microcks mocks from spec)
- Spire conformance tests prove real HTTP/WS responses match the OpenAPI/AsyncAPI schemas
- Catches serialization bugs (e.g. msgpack turns `Date` → `string`, `BigInt` → `number`)
- Property-based tests find edge cases humans would never write by hand

**Costs:**
- Docker dependency in CI (~30s container startup per test run)
- `@microcks/microcks-testcontainers` + `fast-check` + `zod-fast-check` as devDeps
- AsyncAPI spec needs realistic `examples` for Microcks mocks to be useful
- Additional test maintenance when schemas change
- Microcks container image is ~500MB (cached after first pull)

**Where tests live:**
| Test Type | Location | Runs In |
|-----------|----------|---------|
| Property-based round-trips | `libvex-js/test/codec.test.ts` | libvex CI |
| SDK mock integration | `libvex-js/test/integration/connect.test.ts` | libvex CI (Docker) |
| Spire REST conformance | `spire/test/conformance.test.ts` | spire CI (Docker) |
| Spire WS conformance | `spire/test/conformance.test.ts` | spire CI (Docker) |
| Dev-mode WS validator | `spire/src/dev/ws-validator.ts` | spire dev server |

### Step 5.1: Property-Based Round-Trip Tests (libvex)

Already defined in Phase 2 Step 2.4 — `fast-check` + `zod-fast-check`.

### Step 5.2: Microcks Mock Server for SDK Tests (libvex CI)

```typescript
// libvex-js/test/integration/connect.test.ts
import { MicrocksContainer } from '@microcks/microcks-testcontainers'

let microcks: StartedMicrocksContainer
beforeAll(async () => {
  microcks = await new MicrocksContainer('quay.io/microcks/microcks-uber:latest')
    .withMainArtifact(require.resolve('@vex-chat/types/asyncapi.json'))
    .start()
})

test('SDK connects and receives mock messages', async () => {
  const wsUrl = microcks.getWSMockEndpoint('Vex Protocol', '1.0.0')
  const client = new VexClient({ url: wsUrl })
  await client.connect()
  const msg = await client.waitForMessage()
  expect(msg.type).toBe('message')
  expect(msg).toHaveProperty('id')
})
```

### Step 5.3: Microcks Conformance Testing (Spire CI)

```typescript
// spire/test/conformance.test.ts
import { MicrocksContainer, TestRequest } from '@microcks/microcks-testcontainers'

test('Spire REST endpoints conform to OpenAPI', async () => {
  const result = await microcks.testEndpoint({
    serviceId: 'Vex API:1.0.0',
    runnerType: 'OPEN_API_SCHEMA',
    testEndpoint: 'http://localhost:16777',
    timeout: 5000,
  })
  expect(result.success).toBe(true)
})

test('Spire WS messages conform to AsyncAPI', async () => {
  const result = await microcks.testEndpoint({
    serviceId: 'Vex Protocol:1.0.0',
    runnerType: 'ASYNC_API_SCHEMA',
    testEndpoint: 'ws://localhost:16777/ws',
    timeout: 5000,
  })
  expect(result.success).toBe(true)
})
```

### Step 5.4: AsyncAPI Examples

Enrich generated asyncapi.json with example payloads:
```yaml
examples:
  - payload:
      type: message
      id: msg_abc123
      channelId: ch_general
      authorId: usr_xyz
      content: Hello everyone!
      timestamp: 1712592000000
```

### Step 5.5: Dev-Mode AJV Validator in Spire

In development, wrap `ws.send()` to validate outgoing messages against AsyncAPI:
```typescript
if (process.env.NODE_ENV === 'development') {
  const { validateOutgoingMessage } = await import('./dev/ws-validator')
  const originalSend = ws.send.bind(ws)
  ws.send = (data) => {
    validateOutgoingMessage(decode(data).type, decode(data))
    originalSend(data)
  }
}
```

---

## Spire: Express 4 → 5 Migration

**Repo:** `spire` on `protocol-specs` branch
**Do during:** Spire compliance gate (before contract testing)

Express 4 is maintenance-only. Express 5 has better async error handling and
stricter APIs. Key breaking changes to handle:

| Express 4 | Express 5 | Action |
|-----------|-----------|--------|
| `res.send(status)` numeric overload | Removed | Use `res.status(n).send()` |
| `res.json(status, obj)` two-arg | Removed | Use `res.status(n).json(obj)` |
| Sync error handling | Async errors auto-caught | Remove manual `try/catch` → `next(err)` wrappers |
| `app.del()` | Removed | Use `app.delete()` |
| `req.host` | Returns full host (with port) | Check usage |
| `req.query` | Returns `URLSearchParams` (not plain object) | Update query parsing |
| `res.redirect('back')` | Removed | Use `res.redirect(req.get('Referer') \|\| '/')` |

**Migration steps:**
1. `npm install express@5` + `npm install @types/express@5`
2. Update `helmet` to ^8 (Express 5 compatible)
3. Fix all `res.send(status)` → `res.status(n).send()`
4. Fix all `res.json(status, obj)` → `res.status(n).json(obj)`
5. Remove manual async error try/catch wrappers (Express 5 handles them)
6. Update `@types/express` to v5
7. Test all routes

**Also fix during this step:**
- Replace `mysql` → `mysql2` (unmaintained)
- Replace `@extrahash/sleep` → `import { setTimeout } from 'timers/promises'`
- Replace `chalk` → `picocolors` (already used in libvex)
- Upgrade `helmet` ^4 → ^8
- Remove `@types/uuid` (deprecated)
- Replace `uuid` → `crypto.randomUUID()`

---

## vex-chat Monorepo: React 19 Alignment

**Repo:** `vex-chat` on `protocol-specs` branch
**Do during:** Monorepo compliance gate

The UI package (`packages/ui`) has `react@^18` and `react-dom@^18` but the
monorepo root overrides React to `19.2.3`. This is a version conflict.

**Fix:**
1. Update `packages/ui/package.json`: `react` and `react-dom` → `19.2.3` (exact pin)
2. Remove the React override from monorepo root if it exists
3. Verify Storybook 8 works with React 19 (it should — Storybook 8.4+ supports React 19)
4. Verify Mitosis output still compiles

---

## Phase 6: App CI/CD (DEFERRED)

> Deferred until Apple/Google signing credentials are ready.

### Step 6.1: Tauri Desktop Workflow (can do now — only needs GITHUB_TOKEN)

`.github/workflows/desktop.yml` with matrix build for macOS ARM, macOS Intel, Linux, Windows.

### Step 6.2: TestFlight Workflow (blocked on creds)

Needs: P12_BASE64, P12_PASSWORD, KEYCHAIN_PASSWORD, PROVISIONING_PROFILE_BASE64, ASC_KEY_ID, ASC_ISSUER_ID, ASC_API_KEY

### Step 6.3: Android/Play Store Workflow (blocked on creds)

Needs: ANDROID_KEYSTORE_BASE64, KEYSTORE_PASSWORD, KEY_ALIAS, KEY_PASSWORD, GOOGLE_PLAY_SERVICE_ACCOUNT_JSON

---

## Phase 7: Docs + Ecosystem

**Depends on:** Phase 4 (specs)

### Step 7.1: TypeDoc for SDK API Reference

Already partially set up in libvex (`typedoc.json` exists).

### Step 7.2: AsyncAPI Studio Docs

Generate static HTML or embed `@asyncapi/react-component` in website.

### Step 7.3: Swagger/Redoc for REST API

Spire already has `/docs` — upgrade to use generated OpenAPI spec.

### Step 7.4: Deploy to docs.vex.wtf

Consolidate into website app, deploy via Vercel.

### Step 7.5: `oasdiff` Breaking Change Detection

Compare `openapi.json` against last published npm version. Fails CI on undocumented breaking changes.

---

## Execution Order Summary

Each repo gets a compliance gate (license check, LICENSE file, CI enforcement)
before any feature work. The gate is small but non-negotiable.

```
types-js ─────────────────────────────────────────────────────────
  │  ⓪ Compliance gate (license check, LICENSE file, CI step)
  │  1.1 Install Zod 4.1, restructure src/
  │  1.2 Migrate all types to schemas (wire/protocol only)
  │  1.3 Update index.ts re-exports
  │  1.4 Validate: publish to verdaccio, build downstream
  │  1.5 ESLint strict config
  │  1.6 Quality tools + type boundary enforcement in CI
  │  1.7 Enforce wire-only boundary (api-extractor, .describe() check)
  │
  ▼
crypto-js ────────────────────────────────────────────────────────
  │  ⓪ Compliance gate
  │  (no Zod work needed — crypto is pure functions, no type exports)
  │
  ▼
libvex-js ────────────────────────────────────────────────────────
  │  ⓪ Compliance gate
  │  2.1 Move SDK-internal types from @vex-chat/types into src/types/
  │  2.2 createCodec() factory
  │  2.3 Wire codec into Client.ts
  │  2.4 ESLint + TSDoc
  │  2.5 fast-check round-trip tests
  │  2.6 Quality tools in CI
  │  2.7 Validate: publish to verdaccio, test apps in vex-chat
  │
  ▼
spire ────────────────────────────────────────────────────────────
  │  ⓪ Compliance gate
  │  Express 4 → 5 migration
  │  Replace dead deps (mysql→mysql2, sleep→timers/promises,
  │    chalk→picocolors, uuid→crypto.randomUUID, helmet→^8)
  │  (Spire Zod adoption happens later in Phase 5)
  │
  ▼
vex-chat monorepo ────────────────────────────────────────────────
  │  ⓪ Compliance gate
  │  Fix React 18 → 19 in packages/ui
  │  Validate all apps work with verdaccio packages
  │
  ═══════════════════════════════════════════════════════════════
  All repos compliant + Zod migration validated via verdaccio
  ═══════════════════════════════════════════════════════════════
  │
  ▼
Phase 3: Changesets + Publishing (types, crypto, libvex) ─────────
  │  3.1 Changeset config per repo
  │  3.2 CI check (changeset status)
  │  3.3 release.yml with --provenance + SBOM artifact
  │  3.4 Auto-changeset workflow (Claude Code Action)
  │
  ├──▶ Phase 4: Protocol Specs (types-js) ── needs Zod schemas
  │       4.1 OpenAPI generation from Zod
  │       4.2 AsyncAPI generation from Zod
  │       4.3 Drift detection (specs:check)
  │       4.4 Lint specs (vacuum + Spectral)
  │       4.5 Ship specs in npm packages
  │       4.6 Spire serves specs live
  │
  └──▶ Phase 5: Contract Testing (libvex, spire) ── needs specs
         5.1 Round-trip tests (fast-check)
         5.2 Microcks SDK mocks (libvex CI)
         5.3 Microcks Spire conformance (spire CI)
         5.4 AsyncAPI examples for Microcks
         5.5 Dev-mode AJV validator in Spire

Phase 6: App CI/CD ──── DEFERRED (no signing creds)
  6.1 Tauri desktop workflow (can do — only needs GITHUB_TOKEN)

Phase 7: Docs + Ecosystem ──── after specs exist
  7.1-7.5 TypeDoc, AsyncAPI Studio, Swagger, docs.vex.wtf, oasdiff
```

---

## Dependency Audit — Action Items

> Full audit of every dependency across all repos (2026-04-08).
> All licenses pass AGPL-3.0 compatibility (whitelist). No license issues found.

### Remove Immediately (deprecated/unnecessary)

| Package | Repo(s) | Why |
|---------|---------|-----|
| `@types/uuid` | libvex-js, spire, desktop (catalog) | Deprecated — uuid ships its own types |
| `@types/btoa` | libvex-js | `btoa` is global in Node 16+ |
| `tweetnacl` (devDep + peerDep) | types-js | Only used for `nacl.BoxKeyPair` type shape in `IXKeyRing`/`IPreKeysCrypto`, which are moving to libvex. Inline the shape as `{ publicKey: Uint8Array, secretKey: Uint8Array }` instead. Future WASM ADR will replace tweetnacl entirely. |

### Replace (unmaintained/abandoned)

| Current | Replacement | Repo(s) | Why |
|---------|-------------|---------|-----|
| `mysql` | `mysql2` | spire | Last published 2020. Unmaintained. mysql2 is drop-in, actively maintained |
| `@extrahash/sleep` | `import { setTimeout } from 'timers/promises'` | libvex-js, spire | 302 downloads/week. Trivial wrapper. Node built-in since v16 |
| `uuid` | `crypto.randomUUID()` | libvex-js, spire, store, desktop, mobile | Built into Node 19+ and all browsers. Drop the dependency entirely |
| `chalk` ^4 | `picocolors` (already in libvex) | spire | chalk 4 is CJS; project is ESM. picocolors is smaller, faster, already used |
| `bip39` | `@scure/bip39` | crypto-js | Same author ecosystem as @noble/hashes. Better ESM, tree-shaking |

### Upgrade (severely outdated)

| Package | Current | Latest | Repo | Majors behind |
|---------|---------|--------|------|---------------|
| `helmet` | ^4.2.0 | 8.x | spire | 4 |
| `dotenv` | ^8.2.0 | 17.x | libvex-js (devDep) | 9 |
| `object-hash` + `@types/object-hash` | ^2 / ^1 | 3.x / 3.x | libvex-js | 1-2 |
| `Storybook` (all packages) | ^8 | 10.x | ui | 2 |
| `vite` | ^6 | 8.x | ui | 2 |
| `react` / `react-dom` | ^18 | 19.x | ui | 1 (conflicts with monorepo override) |

### Version Skew (standardize across all repos)

| Tool | types-js | crypto-js | libvex-js | spire | vex-chat catalog | desktop | mobile |
|------|----------|-----------|-----------|-------|-----------------|---------|--------|
| TypeScript | ^6.0.2 | ^6.0.2 | ^6.0.2 | ^6.0.2 | ^5.9.3 | ~5.9.3 | ^5.8.3 |
| ESLint | ^9 | ^10 | ^10 | ^10 | ^10 | - | - |
| lint-staged | ^15 | ^15 | ^16 | ^16 | ^16 | - | - |
| vitest | - | ^3 | ^3 | ^3 | - | - | - |

**Standardize all to:** TypeScript 6.0.2, ESLint 10.x, lint-staged 16.x, vitest 4.x.
Update the monorepo pnpm catalog to match.

### Consider Replacing (not urgent but worth evaluating)

| Package | Alternative | Repo | Rationale |
|---------|-------------|------|-----------|
| `axios` | Native `fetch()` | libvex-js | Built into Node 22+. Project requires Node 24. Removes supply chain risk (axios was just attacked). |
| `express` ^4 | `express` ^5 or Hono | spire | Express 4 is maintenance-only. v5 has better async error handling. |
| `ed2curve` | Inline the conversion | crypto-js | 6 years old. Tiny utility (one function). Could inline to remove a dep. |
| `tweetnacl` | `@noble/ciphers` + `@noble/curves` | crypto-js, libvex-js | Mature but 6 years old. @noble is the modern alternative from the same quality tier. Significant refactor. |

### Verdaccio — Add to .gitignore

The monorepo's `.verdaccio/` directory stores local registry data. Add to `.gitignore`:
```gitignore
# Local npm registry (verdaccio)
.verdaccio/storage/
.verdaccio/htpasswd
```

### License Compliance — Include devDependencies

Update the `license:check` script to also check devDependencies:
```json
{
  "scripts": {
    "license:check": "license-checker-rspack-2 --onlyAllow 'MIT;ISC;BSD-2-Clause;BSD-3-Clause;Apache-2.0;0BSD;MPL-2.0;CC0-1.0;CC-BY-4.0;Unlicense;BlueOak-1.0.0;Python-2.0;LGPL-2.1-only;LGPL-2.1-or-later;LGPL-3.0-only;LGPL-3.0-or-later;GPL-2.0-only;GPL-2.0-or-later;GPL-3.0-only;GPL-3.0-or-later;AGPL-3.0-only;AGPL-3.0-or-later;Artistic-2.0;Zlib;PSF-2.0' --excludePrivatePackages",
    "license:check:prod": "license-checker-rspack-2 --onlyAllow '...' --production --excludePrivatePackages"
  }
}
```

Note: removed `--production` from the main check so devDeps are included.
Keep a separate `license:check:prod` for production-only audits.

---

## Questions (Resolved)

| Question | Decision |
|----------|----------|
| Replace axios with fetch? | **Defer.** Large refactor (~3200 line file). |
| Replace tweetnacl with @noble? | **Defer.** Deep crypto refactor. tweetnacl is audited and stable. |
| Express 4 → 5 in spire? | **Yes — do in this branch.** Express 4 is maintenance-only. |
| Storybook 8 → 10 in UI? | **Defer.** Major upgrade, not blocking. |
| React 18 vs 19 in UI package? | **Yes — fix in this branch.** Update to react@19 to match monorepo. |

---

## Manual Steps Checklist (requires human action)

> Reference this while working through beads. These cannot be automated by Claude.

### GitHub Organization (vex-protocol)

```
[ ] Enable 2FA requirement for all org members
     Settings → Authentication security → Require 2FA
[ ] Set default workflow permissions to read-only
     Settings → Actions → General → Workflow permissions → Read repository contents
[ ] Install Socket.dev GitHub App (free tier)
     github.com/marketplace/socket-security
[ ] Install Changeset Bot GitHub App
     github.com/apps/changeset-bot
```

### Per-Repo GitHub Settings (types-js, crypto-js, libvex-js, spire, vex-chat)

```
For EACH repo:

[ ] Enable Dependabot alerts
     Settings → Code security → Dependabot alerts → Enable
[ ] Enable Dependabot security updates
     Settings → Code security → Dependabot security updates → Enable
[ ] Enable secret scanning
     Settings → Code security → Secret scanning → Enable
[ ] Enable push protection
     Settings → Code security → Push protection → Enable
[ ] Enable private vulnerability reporting
     Settings → Code security → Private vulnerability reporting → Enable
[ ] Set default workflow permissions to read-only
     Settings → Actions → General → Workflow permissions → Read contents

[ ] Configure branch protection on master:
     Settings → Branches → Add rule → Branch name: master
     ✓ Require a pull request before merging (1 reviewer min)
     ✓ Dismiss stale pull request approvals when new commits are pushed
     ✓ Require review from Code Owners
     ✓ Require status checks to pass before merging
       - CI (build + test + lint + license:check + type-coverage)
     ✓ Require branches to be up to date before merging
     ✓ Require signed commits
     ✓ Require linear history
     ✓ Require conversation resolution before merging
     ✓ Restrict who can push to matching branches (maintainers only)
     ✓ Do not allow force pushes
     ✓ Do not allow deletions

[ ] Set up SSH commit signing (each developer):
     git config --global gpg.format ssh
     git config --global user.signingkey ~/.ssh/id_ed25519.pub
     git config --global commit.gpgsign true
     git config --global tag.gpgSign true

[ ] Enable vigilant mode:
     GitHub → Settings → SSH and GPG keys → Flag unsigned commits as unverified
```

### npm Registry (npmjs.com)

```
[ ] Enforce 2FA on each published package:
     npm access 2fa-required @vex-chat/types
     npm access 2fa-required @vex-chat/crypto
     npm access 2fa-required @vex-chat/libvex

[ ] Set up OIDC Trusted Publishing for each package:
     npmjs.com → @vex-chat/types → Settings → Trusted Publishers
       GitHub org: vex-protocol
       Repo: types-js
       Workflow: release.yml
       Environment: (none)
     Repeat for @vex-chat/crypto (repo: crypto-js) and @vex-chat/libvex (repo: libvex-js)

[ ] Remove any classic NPM_TOKEN from CI secrets
     (OIDC-only publishing — no long-lived tokens)

[ ] Create granular access tokens for local dev (if needed):
     npmjs.com → Access Tokens → Generate New Token → Granular
     Scope: specific packages only
     Permissions: Read and write
     Expiration: 30 days
```

### Secrets to Add to GitHub Repos

```
Published repos (types-js, crypto-js, libvex-js):
[ ] ANTHROPIC_API_KEY — for Claude Code Action auto-changeset workflow

vex-chat monorepo:
[ ] SOCKET_SECURITY_API_TOKEN — for Socket CLI in CI (get from socket.dev dashboard)

All repos:
[ ] (No NPM_TOKEN needed — OIDC trusted publishing handles it)
```

### External Services

```
[ ] Create Socket.dev account (free tier)
     socket.dev → Sign up → Connect GitHub org
     Get API token for CI usage

[ ] Create Codecov account (optional, for coverage badges)
     codecov.io → Sign up with GitHub → Add repos

[ ] Run OpenSSF Scorecard locally to establish baseline:
     brew install scorecard
     GITHUB_AUTH_TOKEN=ghp_xxx scorecard --repo=github.com/vex-protocol/types-js
```

### One-Time Developer Setup

```
Each team member:
[ ] Install mise: curl https://mise.jdx.dev/install.sh | sh
[ ] SSH signing configured (see above)
[ ] GitHub vigilant mode enabled (see above)
[ ] npm 2FA enabled on personal account
[ ] npm config set save-exact true   (pins deps by default)
[ ] pnpm config set save-exact true  (if working on vex-chat monorepo)
```

---

## Research Documents

- `RESEARCH_ZOD_BINARY_DATA.md` — Uint8Array/codec approach for wire types + OpenAPI
- `vex-license-compliance.pdf` — License whitelist/blacklist, tools, CI workflow

---

## Progress Log

### Compliance Gates — Completed (2026-04-08)

**types-js** (protocol-specs branch, 4 commits):
- 100% type coverage
- Enums converted to `as const` objects (erasableSyntaxOnly compat)
- tweetnacl devDep/peerDep removed (only used for type shape — inlined in libvex)
- `any` → `unknown` in WS message types (4 instances)

**crypto-js** (protocol-specs branch, 4 commits):
- 100% type coverage
- `any` → `unknown` in packMessage/xHMAC
- Non-null assertions eliminated (for-of loops, destructuring defaults, nullish coalescing)
- Repository URL fixed (was pointing to libvex-js)

**libvex-js** (protocol-specs branch, 10+ commits):
- ESLint strictTypeChecked: **490 errors → 0 errors** (zero `any` in production code)
- `useUnknownInCatchVariables: true` — all 24 catch blocks fixed with proper `unknown` narrowing
- `@types/btoa` removed (global in Node 16+)
- Repository URL fixed (was vex-chat/vex-js → vex-protocol/libvex-js)
- Typed WebSocket adapters: `BrowserWebSocket` + `NodeWebSocket` (createNodeWebSocket factory)
- `EventEmitter<ClientEvents>` generic — no declaration merging
- `Map<string, T>` replacing `Record` + `delete` — lint-clean, semantically correct
- Kysely `ColumnType` for nullable insert columns — no `as Insertable` cast
- Kysely `Dialect` IS exported — removed stale `as any` casts for dialect construction
- `IStorage.ts` → `Storage.ts` — fixed 100+ cascading ESLint errors from module resolution
- `decodeAxios()` accepts `unknown` — axios arraybuffer responses typed via generics
- `isAxiosError()` type guard for catch blocks
- `no-unused-vars` configured with `argsIgnorePattern: "^_"`
- 12 remaining `eslint-disable` directives — all `no-unsafe-type-assertion` for msgpack decode casts (need Zod discriminated union to remove)

**spire** (protocol-specs branch, 5 commits):
- 96.52% type coverage (threshold 95%)
- Express 4 → 5 migrated (zero deprecated patterns found — clean upgrade)
- `chalk` → `picocolors` (CJS→ESM)
- `@extrahash/sleep` → `node:timers/promises`
- `uuid.v4()` → `crypto.randomUUID()` (kept uuid for parse/stringify/validate)
- `mysql` removed (was installed but unused — code fell through to SQLite)
- `helmet` ^4 → ^8
- Dead code cleaned: unused imports (IUser, POWER_LEVELS), unused vars (found), unused catch bindings
- `req.params` type narrowing: proper `typeof` check, not `String()` coercion
- ESLint uses `recommendedTypeChecked` (not strict) — too many `any` instances in Express route handlers

### Gotchas + Drifts from Plan

1. **`license-checker-rspack-2` doesn't exist on npm.** The compliance PDF referenced a non-existent package. Used `@onebeyond/license-checker` instead (MIT, last published Jan 2026, `--allowOnly` whitelist approach). Had to add `AGPL-3.0-or-later` to allowlist since own `@vex-chat/*` packages are AGPL.

2. **`eslint-plugin-total-functions` is dead.** Last commit Aug 2024, doesn't support ESLint 9 flat config or TS 6.x. Its key rule `no-unsafe-type-assertion` was absorbed into typescript-eslint v8.15. Removed from plan entirely.

3. **CODEOWNERS removed.** Only 2 contributors — unnecessary overhead.

4. **`erasableSyntaxOnly` + `isolatedDeclarations`** not added to crypto-js/libvex-js/spire. These require explicit return types on every function (isolatedDeclarations) which is a large refactor. Only types-js has them since it's a types-only package. Can add to other repos later.

5. **Spire ESLint strictness deferred.** Spire has hundreds of `any` usages in Express route handlers and msgpack decoding. Using `recommendedTypeChecked` with `any`/`unsafe` rules as warnings. Will upgrade to `strictTypeChecked` when Zod validation is added to routes.

6. **Test files were being ignored by ESLint.** Fixed: restructured tsconfig (tsconfig.json includes tests, tsconfig.build.json excludes for emit). Tests now linted with relaxed rules + `@vitest/eslint-plugin`.

7. **`eslint-plugin-perfectionist`** auto-fix produces large diffs on first run (sorts all imports, object keys, interfaces, enums). This is a one-time cost — future diffs will be minimal.

8. **Socket CLI and lockfile-lint deferred.** Not installed yet — will add when we set up the Socket.dev account. Beads issues exist for this.

9. **GHA SHA pinning deferred.** Actions still use tags (`@v4`). Will pin to SHA with `npx @step-security/secure-repo` in a follow-up.

10. **`knip` not usable across separate repos.** It only works within a single project boundary. Replaced with cross-repo audit script in vex-chat monorepo.

11. **WTFPL license** found in libvex-js transitive deps (argsarray package). Added to allowlist — it's a permissive "do whatever you want" license, compatible with AGPL.

12. **`eslint-plugin-n`** added to spire for Node.js-specific rules. Had to disable `n/no-missing-import` and `n/no-unpublished-import` (conflicts with TypeScript module resolution).

### Full Progress (14 beads closed + ESLint/architecture work)

- [x] types-js compliance gate (beads-at4.1) ✓
- [x] crypto-js compliance gate (beads-at4.2) ✓
- [x] libvex-js compliance gate (beads-at4.3) ✓
- [x] spire compliance gate (beads-at4.4) ✓ — includes Express 5 migration
- [x] vex-chat compliance gate (beads-at4.5) ✓ — React 19 fix
- [x] types-js Zod migration (beads-at4.6) ✓ — all types → Zod schemas
- [x] types-js verdaccio validation (beads-at4.10) ✓
- [x] libvex-js move SDK types (beads-at4.12) ✓
- [x] libvex-js createCodec() factory (beads-at4.14) ✓
- [x] libvex-js verdaccio validation (beads-at4.22) ✓ — 0 errors mobile, 0 errors desktop
- [x] changesets + publishing (beads-at4.23) ✓ — all 3 repos
- [x] fast-check round-trip tests (beads-at4.20) ✓ — 11 tests, 2200 random inputs
- [x] type boundary enforcement (beads-at4.8) ✓ — api-extractor, publint, attw, tsd
- [x] Drop I-prefix from all type names (IUser → User) ✓ — across all repos
- [x] Dates → ISO strings everywhere (lastSeen, timestamp, time) ✓
- [x] decodeSafe() runtime validation on all HTTP responses ✓ — 14 E2E tests pass
- [x] IStorage.ts → Storage.ts rename ✓ — fixed module resolution cascade
- [x] libvex-js ESLint strictTypeChecked: 490 → 0 errors ✓ (2026-04-09)
- [x] useUnknownInCatchVariables: true ✓ — all 24 catch blocks fixed
- [x] Typed WebSocket adapters ✓ — BrowserWebSocket + NodeWebSocket (createNodeWebSocket factory)
- [x] EventEmitter<ClientEvents> generic ✓ — no declaration merging
- [x] Map<string, T> replacing Record + dynamic delete ✓
- [x] Kysely ColumnType for nullable insert columns ✓
- [x] Zero `any` in libvex production code ✓
- [x] Kysely `as any` for dialect removed ✓ — Dialect interface IS exported
- [x] ESLint base config: ban direct HTTP/WebSocket in apps ✓ — no-restricted-imports + no-restricted-globals
- [x] @vex-chat/crypto rebuilt against renamed types (IBaseMsg → BaseMsg) ✓

### Remaining Beads (specs/contract testing/docs — deferred)

- [ ] beads-at4.7 — OpenAPI generation from Zod
- [ ] beads-at4.9 — AsyncAPI generation from Zod
- [ ] beads-at4.11 — Specs drift detection + ship in npm
- [ ] beads-at4.13 — Spire serves specs live
- [ ] beads-at4.15 — Microcks mock server (libvex CI)
- [ ] beads-at4.16 — Microcks conformance (spire CI)
- [ ] beads-at4.17 — Dev-mode AJV validator (spire)
- [ ] beads-at4.18 — AsyncAPI examples for Microcks
- [ ] beads-at4.19 — Tauri desktop CI/CD
- [ ] beads-at4.21 — Docs (TypeDoc + AsyncAPI + Swagger)
- [ ] beads-956 — Shared ESLint config package

### In Progress — Architecture Refactoring

#### Remove PlatformPreset from libvex (SDK should be platform-agnostic)

**Decision:** libvex only contains what's shared between ALL consumers (bots, AI agents, CLI, mobile, desktop). Platform-specific code moves to the apps. PlatformPreset type moves to the store.

**Rationale:** Following Discord.js, Matrix, Signal, Prisma patterns — core SDK defines interfaces, consumers bring implementations. A bot shouldn't pull in expo-sqlite. An AI agent shouldn't see kysely-dialect-tauri.

**What stays in libvex:**
- Client.ts, codec, types, Storage interface, utils
- preset/node.ts (SDK default for bots/CLI/tests)
- preset/test.ts (test infrastructure)
- storage/node.ts, storage/sqlite.ts, schema.ts (Node defaults + shared SQLite impl)
- transport/browser.ts (zero-dep, shared by both GUI clients)
- keystore/memory.ts (testing)

**What moves to vex-chat monorepo apps:**
- preset/tauri.ts + storage/tauri.ts → apps/desktop/src/lib/platform.ts
- preset/expo.ts + storage/expo.ts → apps/mobile/src/lib/platform.ts
- ambient.d.ts (ExpoDialect declaration) → apps/mobile/src/kysely-expo.d.ts

**Store changes:**
- Replace `PlatformPreset` with store-owned `BootstrapConfig` type
- Fix `as any` cast in bootstrap.ts:250 — use `ClientOptions` type annotation
- Split bootstrap.ts (361 lines) → auth.ts + client-init.ts + populate.ts
- Fix all `catch (err: any)` → `catch (err: unknown)`
- Export `BootstrapConfig` type for apps

**App changes:**
- Desktop: `tauriPreset()` → `desktopConfig()` (local platform.ts)
- Mobile: `expoPreset()` → `mobileConfig()` (local platform.ts)
- Mobile: fix hardcoded localhost:16777 → `__DEV__` conditional

#### Remaining eslint-disable directives (12 in libvex)

All 12 are `no-unsafe-type-assertion` for msgpack.decode() casts. Removal requires:
- Add literal `type` fields to all WS message schemas in @vex-chat/types
- Create `z.discriminatedUnion("type", [...])` in libvex
- Replace `as ChallMsg` / `as SuccessMsg` with `wsMessage.parse()`
- Also removes the unvalidated fast-path `decode()` in codec.ts

This is deferred until the architecture refactoring is complete.

#### ESLint SDK-only enforcement (DONE)

`appImportRestrictions` in packages/eslint-config/base.js now bans:
- Direct HTTP clients: axios, ky, ofetch, got, node-fetch, undici
- Direct WebSocket: ws, websocket, sockjs-client, socket.io-client
- Browser globals: fetch(), XMLHttpRequest, WebSocket (in apps only)
- SDK internals: @vex-chat/types, @vex-chat/crypto

Website exempted from no-restricted-globals (marketing site uses fetch for download metadata, privacy policies, invite previews).

### Additional Gotchas from Recent Work

13. **`z.instanceof(Uint8Array)` causes `ArrayBuffer` vs `ArrayBufferLike` generic mismatch in TS 6.** Fixed with `z.custom<Uint8Array<any>>()` — see `uint8` helper in `schemas/common.ts`.

14. **`zod-fast-check` doesn't support Zod v4.** Peer dep is `zod ^3.18.0`. Wrote fast-check arbitraries by hand instead. `@traversable/zod-test` claims Zod v4 support but untested.

15. **fast-check v4 removed `fc.hexaString()`.** Use `fc.stringMatching(/^[0-9a-f]+$/)` instead. Also `fc.record()` generates null-prototype objects by default — need `noNullPrototype: true`.

16. **`undefined` doesn't survive msgpack round-trip.** Gets turned to `null` or dropped. Use `null` for optional fields in wire types.

17. **Desktop app had 19 type errors** from stale API usage (wrong method names, `"mail"` event instead of `"message"`, missing SDK methods). Fixed by updating to correct Client API. File attachments and device management commented out with TODO (need SDK support).

18. **Store `cleanupStaleDevices` was dead code.** Called `IDevices.list()` which doesn't exist in the public API. Removed.

19. **Client `IUser.lastSeen` was `number` but `@vex-chat/types` says `Date`.** Types are source of truth — fixed Client to use `Date`.

20. **Store tsconfig inherited `exclude: ["../../packages"]` from root.** Fixed by overriding with `exclude: []`.

21. **Cross-repo type usage audit dropped.** knip can't work across separate repos, grep-based script too noisy. Rely on api-extractor committed report for PR-visible API surface changes.

22. **`api-extractor` warns about bundled TS 5.9 vs project TS 6.0.** Works fine — just a version mismatch warning. Consider upgrading api-extractor when it supports TS 6.

23. **`attw` flags CJS resolution warning for ESM-only package.** Expected — suppressed with `--ignore-rules cjs-resolves-to-esm`.

24. **`preKey.index` is nullable from server** but schema had `z.number()`. Fixed with `z.number().nullable()` in types-js `keys.ts`. This is exactly the kind of bug `decodeSafe()` catches — the whole point of runtime validation.

25. **Production API at `api.vex.wtf` still sends `Date` objects** for `actionToken.time` field. Spire source already has the fix (`new Date().toISOString()`) but hasn't been deployed. E2E tests fail against production until Spire is deployed.

26. **`@vex-chat/crypto` dist had stale type names** (IBaseMsg instead of BaseMsg). Rebuilt crypto-js against updated types-js to fix. Must rebuild + republish crypto whenever types are renamed.

27. **kysely-expo types conflict with Kysely's ESM build.** The `#private` class fields in CJS and ESM builds are incompatible. Installing kysely-expo as devDep does NOT fix the type mismatch. Ambient declaration with `implements Dialect` via indexed access types (`Dialect["createDriver"]`) is the workaround.

28. **`while(true)` triggers `no-unnecessary-condition`.** Replaced with `for(;;)` — same semantics, no lint rule violation. The `postAuth()` infinite polling loop is a design smell (should be push-based via WebSocket notify events) but functional.

29. **Mobile `config.ts` hardcoded to `localhost:16777`** — will not work in production. Must use `__DEV__` conditional or env vars.

30. **Store `bootstrap.ts` has `as any` on Client.create() call** (line 250). ServerOptions fields are a subset of ClientOptions — fix by using a typed intermediate variable instead of spread + cast.

31. **20 nanostores atoms across 18 files** — over-fragmented. `avatarHash.ts` is 7 lines. Could consolidate into 4-5 domain groups (auth, messaging, servers, presence).

32. **Navigation typing is `any` across 7+ mobile screens.** Should use `NativeStackScreenProps<RootStackParamList>`.

33. **Message persistence diverges between platforms.** Desktop uses Client's SQLite. Mobile uses AsyncStorage with manual memory restore. No shared abstraction.

34. **`no-dynamic-delete` resolved with Map.** `Record<string, T>` + `delete obj[key]` replaced with `Map<string, T>` + `.delete()`. Map is semantically correct for sparse mutable lookups and avoids V8 dictionary mode deoptimization.

35. **EventEmitter declaration merging resolved.** eventemitter3 v5 has a built-in `EventEmitter<EventTypes>` generic parameter. Define `ClientEvents` interface, pass as generic — typed events without interface+class merge. Discord.js uses the same pattern.
