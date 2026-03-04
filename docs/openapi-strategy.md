# OpenAPI Strategy for vex-chat/spire

High-level plan for auto-generating, linting, and serving OpenAPI documentation from the Express + Zod + TypeScript codebase in `apps/spire`.

---

## Chosen Stack

| Layer | Tool | Why |
|---|---|---|
| Schema generation | `@asteasolutions/zod-to-openapi` | Dominant (~1.7M weekly downloads), Zod v4 native, OAS 3.1 support |
| Docs UI (local) | `@scalar/express-api-reference` | Modern UI, built-in API client, 25+ language snippets, 11 themes |
| Spec linting | `@stoplight/spectral-cli` | Industry standard, 40+ OAS rules, CI-ready |
| Pre-commit gate | `husky` + `lint-staged` | Only lints when `openapi.json` is staged — keeps commits fast |
| Runtime guard (optional) | `express-openapi-validator` | Validates incoming requests against the spec at runtime |

### Rejected alternatives

- **`tsoa`** — decorator-based, requires `emitDecoratorMetadata` which breaks with `verbatimModuleSyntax` (our root tsconfig). Also has no first-class Zod support.
- **`zod-openapi` (samchungy)** — architecturally cleaner but ~14x fewer downloads, sparse community, less ergonomic for route-based APIs.
- **`swagger-ui-express`** — dated 2011-era UI. Scalar is a drop-in replacement with a far better DX.
- **`redoc` / `@redocly/cli`** — beautiful but read-only in OSS tier. No "Try It" without a paid plan.

---

## How Generation Works

`@asteasolutions/zod-to-openapi` adds an `OpenAPIRegistry` that collects schemas and route definitions. At build time (or server start) a generator emits the final OAS document.

**Key pattern:** Each domain file registers its Zod schemas and routes into the shared registry. The registry is the single source of truth for the spec.

```
src/
├── openapi.ts          ← registry + generateOpenAPIDocument()
├── auth/
│   ├── schemas.ts      ← z.object(...).openapi(...)  +  registry.register()
│   └── routes.ts       ← registry.registerPath({ method, path, request, responses })
├── devices/
│   └── ...
└── ...
scripts/
└── generate-openapi.ts ← imports all route files → calls generateOpenAPIDocument() → writes openapi.json
```

The generator call is cheap (pure in-memory object traversal). Total overhead at startup is negligible.

---

## File Layout

```
apps/spire/
├── src/
│   ├── openapi.ts                  # registry singleton + generateOpenAPIDocument()
│   ├── auth/schemas.ts             # RegisterBodySchema, LoginBodySchema, JWTPayloadSchema
│   ├── auth/routes.ts              # registry.registerPath() calls for auth endpoints
│   ├── devices/schemas.ts
│   ├── devices/routes.ts
│   ├── ... (one schemas.ts + routes.ts per domain)
│   └── index.ts                    # imports all route files before calling generateOpenAPIDocument()
├── scripts/
│   └── generate-openapi.ts         # standalone script: generate → write openapi.json
├── openapi.json                    # committed to git (see below)
└── .spectral.yaml                  # linting ruleset
```

---

## Build Pipeline

### Dev

The server generates and serves the spec at startup from memory. No file write needed during development — Scalar reads from the live in-memory spec object.

```typescript
// src/index.ts (dev server)
import { generateOpenAPIDocument } from "./openapi.js";

const spec = generateOpenAPIDocument();

app.use("/docs", apiReference({ content: spec, theme: "purple" }));
app.get("/openapi.json", (_req, res) => res.json(spec));
```

Docs available at `http://localhost:16777/docs`.

### Build / CI

A script generates `openapi.json` to disk before the TypeScript build. This artifact is committed.

```json
// package.json scripts
{
  "generate:openapi": "node --import tsx/esm scripts/generate-openapi.ts",
  "build": "pnpm generate:openapi && tsc -p tsconfig.build.json",
  "lint:openapi": "spectral lint openapi.json --ruleset .spectral.yaml"
}
```

### Committing `openapi.json`

**Yes, commit it.** Treat it as a first-class source artifact, not a gitignored build output.

Reasons:
- PR diffs show exactly what changed in the API contract
- Spectral can lint it in pre-commit without a build step
- Downstream tooling (SDK generation, Postman collection sync) can trigger on spec changes
- Avoids requiring every reviewer to run a build to see what changed

**CI drift check** — catches cases where someone changed a route without regenerating:

```yaml
# .github/workflows/check-openapi.yml
- run: pnpm generate:openapi
- run: |
    if ! git diff --exit-code openapi.json; then
      echo "openapi.json is out of date. Run 'pnpm generate:openapi' and commit."
      exit 1
    fi
```

---

## Spectral Linting

### `.spectral.yaml`

```yaml
extends:
  - "spectral:oas"

rules:
  # Disable rules that don't fit the project
  info-contact: off

  # Downgrade noisy rules to warnings
  operation-description: warn
  oas3-parameter-description: warn
  tag-description: warn

  # Custom rules (examples)
  no-x-internal-in-responses:
    description: Internal-only endpoints should not appear in the public spec
    given: "$.paths[*][*]"
    severity: warn
    then:
      field: x-internal
      function: falsy
```

The `spectral:oas` built-in ruleset covers ~40 rules including: duplicate operationIds, missing `items` on array types, path parameters without declarations, unused components, and trailing slashes on server URLs.

### Pre-commit hook

Only runs when `openapi.json` is staged — no slowdown on unrelated commits.

```json
// .lintstagedrc.json (in apps/spire/)
{
  "openapi.json": ["spectral lint --fail-severity=error --ruleset .spectral.yaml"]
}
```

```bash
# .husky/pre-commit
pnpm --filter @vex-chat/spire lint-staged
```

---

## Local Docs Site

Scalar is served as Express middleware at `/docs`. In dev it is always up-to-date because it reads from the live in-memory spec.

```typescript
import { apiReference } from "@scalar/express-api-reference";

app.use(
  "/docs",
  apiReference({
    content: generateOpenAPIDocument(),
    theme: "purple",       // options: default, moon, purple, solarized, bluePlanet, ...
    layout: "modern",
  })
);
```

Features available locally:
- Interactive "Try It" API client (no Postman needed)
- Request/response history
- Code snippets in 25+ languages (curl, fetch, axios, Python, Go, etc.)
- Environment variable support (set base URL, auth token once)
- Dark/light mode

---

## Optional: Runtime Request Validation

`express-openapi-validator` validates incoming requests against the spec at runtime, rejecting malformed requests with a 400 before they reach route handlers. This adds defense-in-depth on top of the Zod validation already in routes.

```typescript
import OpenApiValidator from "express-openapi-validator";

// Only in development — catches spec drift early
if (process.env.NODE_ENV === "development") {
  app.use(
    OpenApiValidator.middleware({
      apiSpec: generateOpenAPIDocument() as any,
      validateRequests: true,
      validateResponses: true,  // catches response shape regressions
    })
  );
}
```

> **Note:** Enabling `validateResponses: true` in dev is high-value for catching regressions but adds ~2-5ms per response. Disable in production.

---

## Dependency List

```jsonc
// apps/spire/package.json additions
{
  "dependencies": {
    "@asteasolutions/zod-to-openapi": "^8.x",
    "@scalar/express-api-reference": "^latest"
  },
  "devDependencies": {
    "@stoplight/spectral-cli": "^6.x",
    "express-openapi-validator": "^5.x",   // optional
    "husky": "^9.x",
    "lint-staged": "^15.x"
  }
}
```

---

## Open Questions / Decisions

1. **OAS 3.0 vs 3.1** — The library supports both (`OpenApiGeneratorV3` and `OpenApiGeneratorV31`). OAS 3.1 aligns with JSON Schema 2020-12 and is the future standard, but some tooling (Postman, some validators) has incomplete 3.1 support. Recommend starting with 3.1 and downgrading if tooling compatibility issues arise.

2. **`extendZodWithOpenApi(z)` call location** — Must be called exactly once, before any schema definitions. The entry point of `apps/spire` (`src/index.ts`) is the right place. If any route file is imported before this call (e.g. in tests), schemas will lack `.openapi()` metadata. A guard can be added to detect this.

3. **Spectral strictness level** — The `spectral:oas` built-in treats most style rules as warnings (`warn`) by default. The pre-commit hook uses `--fail-severity=error` so only hard errors block commits. Gradually promote warnings to errors as the API matures.

4. **SDK generation** — Once `openapi.json` is stable, `openapi-typescript` (for generating TypeScript client types) or `@hey-api/openapi-ts` (full client SDK) can consume it. This is a natural next step after the spec is committed.

---

## Implementation Notes for beads

This strategy should be incorporated into the following existing beads issues:

- **`vex-chat-l3q`** (Implement utility functions) — add `src/openapi.ts` registry setup here, alongside logger/UUID/config
- **`vex-chat-ekb`** (Implement HTTP API routes) — each route file calls `registry.registerPath()`; Scalar middleware mounted at `/docs`
- **`vex-chat-63b`** (Entry point) — `extendZodWithOpenApi(z)` called at top of `run.ts`; `generate:openapi` script wired into build

New beads issues to create:
- `[TEST] OpenAPI spec shape tests` — vitest tests that call `generateOpenAPIDocument()` and assert key paths/schemas are present and valid
- `[IMPL] Add Spectral + Husky pre-commit linting for openapi.json`
