# ADR-002: OpenTelemetry tracing without logging for observability

## Status

Proposed

## Context

Vex needs observability to defend its reliability targets (99.9% message delivery, 99.9% API availability — see `docs/ops/reliability.md`). We need to detect failures, measure SLOs, and debug production issues.

Two approaches exist:

**Option A: Traditional logging.** Keep Pino structured logs, ship them to a log aggregator (Loki, CloudWatch, Datadog Logs), query logs to detect failures. This is what most Node.js apps do.

**Option B: Distributed tracing via OpenTelemetry.** Replace log-based observability with OTel traces and metrics. Use a PrivacySpanProcessor to strip sensitive data in-process. Export sanitised spans to Honeycomb. Define SLOs on trace data. Keep Pino only for local development — never ship logs to a third party.

### What logging looked like in old Spire

The original Spire server (pre-monorepo, `~/Public/spire/`) used Winston + Morgan with no meaningful privacy controls. An audit of that codebase reveals what happens when logging is the primary observability tool in a privacy-focused app: **it silently becomes a surveillance system.**

**Action tokens logged in plaintext** (`Spire.ts:153, 293`):
```
this.log.info("Validating token: " + key);
this.log.info("New token created: " + token.key);
```
Full UUID tokens used for registration, file uploads, and device connections — written to `vex:spire.log` on disk. An attacker with read access to log files could reuse these tokens for privilege escalation.

**User details dumped on every WebSocket connection** (`Spire.ts:203`):
```
this.log.info(JSON.stringify(userDetails));
```
User IDs, usernames, and lastSeen timestamps written to disk every time a client connected.

**Message recipient device IDs logged** (`Spire.ts:358`, `ClientManager.ts:281`):
```
this.log.info("Received mail for " + mail.recipient);
```
Reveals the communication graph — who is messaging whom — in plaintext log files.

**Raw error stack traces sent to clients** (`server/index.ts:338, 429, 462, 506, 552, 588`):
```
res.status(500).send(err.toString());
```
Internal paths, database error messages, library versions exposed in HTTP responses. Six separate locations.

**Morgan HTTP logging with no redaction** (`server/index.ts:142`):
```
api.use(morgan("dev", { stream: process.stdout }));
```
Every request logged with full URL path (containing user IDs, device IDs), no filtering.

**Log files written to disk unencrypted:**
- `vex:spire.log` — all server activity including tokens and user details
- `vex:spire-db.log` — all database operations
- `vex:client-manager.log` — all WebSocket connections with token validation

None of these log files had any access controls, encryption, rotation, or retention policy.

### What an attacker would find on a compromised old Spire server

If someone gained read access to the old server — even without database access — the log files alone would expose:

| Data | Location | Impact |
|---|---|---|
| Action tokens (registration, file upload, device connect) | `vex:spire.log` | Impersonate users, escalate privileges |
| Communication graph (who messaged whom) | `vex:spire.log` | Metadata surveillance — the thing E2E encryption is supposed to prevent |
| User IDs + usernames + last seen timestamps | `vex:spire.log`, `vex:client-manager.log` | Full user directory with activity patterns |
| Internal error details + stack traces | `vex:spire.log` | Reveal code paths, library versions, database schema for further exploitation |
| HTTP request URLs with embedded IDs | stdout (Morgan) | Device IDs, user IDs in every request path |

With database access, an attacker additionally gets: all public key material (preKeys, OTKs, signKeys), password hashes (PBKDF2 with only 1,000 iterations — crackable), all message metadata (sender, recipient, timestamps, group info), the server private signing key (SPK) from environment variables, and all uploaded files (avatars named by userID, files by UUID).

**The message ciphertext itself was protected by E2E encryption.** But the metadata — who communicated with whom, when, how often, from which devices — was fully exposed in plaintext log files. For a privacy-focused app, this is the critical failure: E2E encryption protects content, but uncontrolled logging leaks the metadata that intelligence agencies actually care about.

### Spire's current logging improvements

Spire uses Pino with explicit redaction of `req.headers.authorization`, `req.headers.cookie`, `password`, `passwordHash`, `token`, `accessToken`, `refreshToken`, `secret`, and `apiKey` (see `utils/logger.ts`). Error responses return generic messages, not stack traces. This is a significant improvement over the original logging.

But Pino structured HTTP logs still contain:

| Field | PII Risk | Present in Pino HTTP logs |
|---|---|---|
| `req.url` | High — contains device IDs, user IDs in path (`/mail/abc-123`) | Yes |
| `req.remoteAddress` | High — client IP address | Yes |
| `req.headers.user-agent` | Medium — device fingerprinting | Yes |
| `res.statusCode` | None | Yes |
| `responseTime` | None | Yes |

The deny-list approach (redact known-bad fields) is better than nothing, but it fails open — any field not on the list passes through. A developer adding `logger.info({ deviceId, action: 'otk_consumed' })` in a new feature inadvertently leaks device identity. The old Spire proves this isn't hypothetical — every `log.info()` call was a data leak waiting to happen.

If we ship these logs to any third party, we leak user metadata. If we self-host a log aggregator, we take on significant operational burden (Loki + Grafana, or ELK) for a 2-person team. If we redact logs more aggressively, they lose diagnostic value — `GET /[REDACTED] 500 42ms` from `[REDACTED]` is useless for debugging.

### The tracing advantage

Tracing solves the privacy-observability tension because it separates the data model:

- **Span attributes are an explicit allow-list.** We define exactly which fields exist on each span. Nothing is captured implicitly. Logs capture whatever the logger prints — tracing captures only what we instrument.
- **A PrivacySpanProcessor strips data in-process.** Even if auto-instrumentation captures something we didn't intend (e.g., a new OTel version adds `url.path`), the processor removes it before export. This is defence in depth that log redaction cannot match.
- **The OTel Collector runs in fail-closed mode.** `allow_all_keys: false` means any attribute not on the allow-list is dropped before data leaves our infrastructure. Logs have no equivalent gateway.
- **SLOs are defined on trace data natively.** Honeycomb's SLO feature queries span attributes directly. With logs, you'd parse log lines to extract metrics — fragile and error-prone.

### What we actually collect

13 attributes total. Every one is either a boolean, a count, a route pattern, or a version string. Zero user identifiers, zero IP addresses, zero message content.

| Attribute | Type | Purpose |
|---|---|---|
| `http.request.method` | string | GET, POST, etc. |
| `http.response.status_code` | integer | Required for API availability SLI |
| `http.route` | string | Route pattern (`/mail/:deviceID`), not actual path |
| `error.type` | string | Error class name |
| `service.name` | string | "vex-spire" |
| `service.version` | string | Deploy version |
| `vex.client.type` | string | "desktop" or "mobile" — from `X-Vex-Client` header |
| `vex.client.version` | string | "0.3.1" — from `X-Vex-Client` header |
| `vex.mail.delivered` | boolean | Required for message delivery SLI |
| `vex.mail.device_count` | integer | Fan-out count, no device IDs |
| `vex.ws.event` | string | "connect", "auth", "disconnect" |
| `vex.keys.bundle_ok` | boolean | Key bundle assembly success |
| `vex.keys.otk_remaining` | integer | OTK pool depth gauge |

Compare this to what a single Pino HTTP log line contains: full URL path with embedded IDs, client IP address, user agent string, request headers, response time, and whatever the developer chose to log in the handler. Tracing is categorically more controllable.

### Pino + OTel integration

Pino is not replaced — it is bridged. Two packages make this work:

**`@opentelemetry/instrumentation-pino`** (with `disableLogSending: true`) automatically injects `trace_id`, `span_id`, and `trace_flags` into every Pino log line emitted inside an active span. This is purely additive — it modifies the log record before Pino serialises it. No log data flows through the OTel pipeline. No log data is exported to Honeycomb.

A local Pino log line becomes:
```json
{"level":50,"msg":"Database query failed","trace_id":"abc123...","span_id":"789xyz...","trace_flags":"01"}
```

When reading local stdout logs, the `trace_id` value can be searched in Honeycomb to find the corresponding trace. This is log-trace correlation without log shipping.

**`span.recordException(err)`** attaches error details to the active span as a span event. When an error occurs anywhere in the request lifecycle, the error middleware:

1. Gets the active span (created by OTel Express auto-instrumentation)
2. Calls `span.recordException(err)` — creates an `"exception"` event with `exception.type` and `exception.message`
3. Calls `span.setStatus({ code: SpanStatusCode.ERROR })` — marks the span red in Honeycomb
4. Logs via Pino for local stdout visibility (with trace_id auto-injected)
5. Returns a generic error response to the client (no stack traces, no internals)

The span event rides with the trace through the existing trace pipeline — no separate log exporter, no separate log pipeline, no additional data leaving the process. The PrivacySpanProcessor and OTel Collector allow-list filter span event attributes the same way they filter span attributes.

**What we do NOT use:**
- `pino-opentelemetry-transport` — ships every Pino log line through OTLP to an external backend. Creates its own `LoggerProvider` in a worker thread, bypassing the PrivacySpanProcessor entirely. This is the opposite of what we want.
- OTel `LogRecordProcessor` / `LogRecordExporter` — no log pipeline is configured. The SDK has no `LoggerProvider`. Even if `disableLogSending` were accidentally left as `false`, log sending would be a no-op because there is no log provider to send to. Defence in depth.

**Privacy note on `recordException`:** The `exception.stacktrace` attribute contains file paths. These reveal internal code structure but not user data. The `exception.message` is the bigger risk — if error messages include user input (e.g., "Device abc-123 not found"), that leaks a device ID into Honeycomb. Error messages must use generic text ("Device not found") or the PrivacySpanProcessor must strip `exception.message`. Our existing error classes (`AppError`, `NotFoundError`, `AuthError`, etc. in `errors.ts`) already use generic messages.

### No client instrumentation

We do not instrument the clients. No analytics SDKs, no crash reporting libraries, no telemetry beacons. The only client-originated data is a single HTTP header (`X-Vex-Client: desktop/0.3.1`) sent on requests the client already makes. No new network requests.

This matches Signal's approach — zero analytics SDKs, zero automated crash reporting. Crash reports are manual and user-initiated.

### Production log level: `error` only

In production, Pino runs at `LOG_LEVEL=error`. This is a security hardening measure, not just noise reduction.

If an attacker compromises the server and reads stdout (via `journalctl`, `docker logs`, or process memory):

| Log Level | What They See |
|---|---|
| `info` | Every HTTP request with URL paths containing device IDs, WebSocket connections, general activity — a surveillance record of all server activity |
| `error` | Only things that broke, with generic messages from `AppError` classes ("Not found", "Unauthorized") — no user identity, no communication patterns, no useful intelligence |

The old Spire's Winston also defaulted to `"error"` in production — but Morgan logged every HTTP request regardless, and developers added `log.info()` calls with tokens and user details throughout the code. The log level was the right idea undermined by undisciplined logging.

Our approach eliminates the risk entirely:
- **Production stdout contains only error-level logs** — generic messages, no user data
- **Operational visibility comes from OTel spans** — 13 allow-listed attributes exported via OTLP, never written to the local filesystem
- **Development uses `info` or `debug` freely** — it's local, not persisted, not a target

An attacker who compromises the server finds: error logs with generic messages on stdout, no log files on disk, and a database containing only ciphertext and public key material. The operational telemetry (SLOs, burn rates, per-endpoint breakdowns) lives in Honeycomb, which requires separate credentials to access.

### Defence in depth

Even with this minimal collection, four layers prevent data leakage:

1. **Production log level** — `LOG_LEVEL=error` ensures Pino only writes when something breaks. Generic error messages, no user data in stdout
2. **SDK config** — disable unnecessary instrumentations (fs, dns, net), never enable header/body capture
3. **PrivacySpanProcessor** — strips `url.full`, `url.path`, `url.query`, `client.address`, `network.peer.address`, `user_agent.original`, `db.query.text` in-process before export
4. **Honeycomb EU endpoint** — GDPR compliant, SOC 2 Type II, 60-day retention, encrypted at rest and in transit

The OTel Collector is not in the initial architecture. The SDK exports directly to Honeycomb from the single box. If added later (Phase 4), it becomes a fifth layer with allow-list mode (`allow_all_keys: false`).

## Decision

Adopt OpenTelemetry tracing as the primary observability mechanism. Do not ship logs to any third party.

- **Server (Spire):** OTel SDK with auto-instrumentation (HTTP, Express, Pino) + custom spans for mail delivery, key exchange, WebSocket lifecycle. PrivacySpanProcessor strips all sensitive attributes. Export directly to Honeycomb EU from the single box — no Collector initially.
- **Pino integration:** `@opentelemetry/instrumentation-pino` with `disableLogSending: true` injects trace IDs into Pino stdout output. Errors are attached to spans via `span.recordException()`, not shipped as log signals. No `LoggerProvider` configured — no log pipeline exists.
- **Clients (desktop, mobile):** No instrumentation. A single `X-Vex-Client` header on existing HTTP requests provides client type and version.
- **Pino logging:** `LOG_LEVEL=error` in production — only errors reach stdout, with generic messages from `AppError` classes. Development uses `info` or `debug` freely. Never shipped to a third-party service. Enriched with `trace_id` and `span_id` for local log-trace correlation.

## Rationale

1. **Privacy by architecture, not policy.** Tracing with an allow-list of 13 attributes is structurally safer than log redaction with a deny-list that must anticipate every possible sensitive field. Allow-lists fail closed. Deny-lists fail open. The old Spire proves what happens with deny-lists: developers write `log.info("Received mail for " + mail.recipient)` and nobody catches it because the deny-list doesn't know about `recipient`. With an allow-list, that data never exists in the first place.

2. **Logs are a liability on disk.** The old Spire wrote `vex:spire.log`, `vex:spire-db.log`, and `vex:client-manager.log` to disk unencrypted with no rotation or retention policy. These files contained action tokens, user details, and communication metadata. A server compromise didn't require accessing the database — the log files were a complete surveillance record. OTel tracing produces no files on disk. Spans are exported over OTLP and never persisted locally.

3. **Observability without surveillance.** We know *that* a message was delivered (boolean), *how many* devices received it (count), and *which client version* sent it (string). We never know who sent it, who received it, or what it contained. Compare this to what the old Spire's logs contained: the full communication graph, user identities, and reusable authentication tokens.

4. **SLOs are first-class.** Honeycomb defines SLOs directly on span attributes. No log parsing, no regex extraction, no intermediate metrics pipeline. The SLI is `vex.mail.delivered == true` as a percentage of all `vex.mail.fanout` spans.

5. **Signal-grade client privacy.** Signal uses zero analytics SDKs. We match that. The `X-Vex-Client` header is less invasive than what HTTP already exposes (User-Agent) — and we strip User-Agent before export.

6. **Operational simplicity.** A 2-person team cannot operate a self-hosted log aggregator (Loki/ELK) alongside a tracing backend. Honeycomb Pro at $83/month replaces both, and the OTel Collector runs as a single sidecar process.

## Trade-offs

### What we gain

- Structurally minimal data collection — 13 attributes, all operational, zero PII
- SLO tracking with burn rate alerts out of the box
- BubbleUp root cause analysis (Honeycomb compares failing vs passing spans automatically)
- Defence-in-depth privacy (4 layers, fail-closed)
- No log aggregator infrastructure to maintain

### What we give up

- **No production log search.** If a bug requires reading "what happened during this request," we cannot grep logs in a dashboard. Mitigation: Pino still writes to stdout in production — operators can `journalctl` or `docker logs` for recent events. For structured investigation, trace spans provide the timeline.

- **Debugging depth.** Traces show span timing and attributes but not arbitrary log lines. A developer cannot `logger.info({ step: 'decrypting', keyId })` and see it in Honeycomb. Mitigation: add span events (OTel's equivalent of in-span log entries) for critical debugging points, subject to the same attribute allow-list.

- **OTel learning curve.** The team must learn span/trace concepts, OTel SDK configuration, and Honeycomb's query language. Mitigation: the OTel Node.js SDK auto-instruments Express with minimal configuration. Custom spans are ~5 lines each.

- **Honeycomb dependency.** Tracing goes through a third-party SaaS. Mitigation: the data Honeycomb receives contains zero PII (verified by 4 layers of filtering). If unacceptable in future, SigNoz is a self-hosted alternative that accepts OTLP natively with built-in SLOs.

- **Honeycomb cost.** Free tier has no SLO features. Pro is $83/month. Mitigation: start on Free for baseline data, upgrade to Pro only when ready to enforce SLOs. Still cheaper than self-hosted Grafana/Loki/Tempo infrastructure.

## Consequences

### Positive

- Privacy claim is architecturally defensible. "We collect 13 operational attributes, zero user identifiers" is auditable and verifiable.
- SLOs are enforced from day one with burn rate alerts, not aspirational dashboard numbers.
- No "we forgot to redact X in the logs" incidents. The old Spire had at least 6 locations where sensitive data was logged without anyone noticing. The allow-list makes this category of bug impossible — data not on the list never exists in the telemetry pipeline.
- Client privacy matches Signal's standard — zero telemetry SDKs, user-initiated crash reports only.

### Negative

- Cannot search production logs remotely. Must SSH into the server for recent log output.
- Custom spans require explicit instrumentation work for mail delivery, key exchange, and WebSocket lifecycle (estimated 4-6 custom spans total).
- Team must maintain the OTel Collector configuration and Honeycomb account.

## Revisit Triggers

- **Self-hosting requirement.** If users or regulators require that zero operational data leaves our infrastructure, migrate from Honeycomb to self-hosted SigNoz. The OTel instrumentation and Collector pipeline remain identical — only the exporter endpoint changes.
- **Debugging insufficiency.** If trace spans prove inadequate for production debugging and the team consistently needs log search, evaluate shipping redacted logs to a self-hosted Loki instance (never a third-party SaaS).
- **Scale beyond OTel Collector capacity.** If trace volume exceeds what a single Collector sidecar can process, evaluate Collector clustering or tail-based sampling.
