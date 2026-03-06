# ADR-003: OpenTelemetry tracing without logging for observability

## Status

Proposed

## Context

Vex needs observability to defend its reliability targets (99.9% message delivery, 99.9% API availability — see `docs/ops/reliability.md`). We need to detect failures, measure SLOs, and debug production issues.

Two approaches exist:

**Option A: Traditional logging.** Keep Pino structured logs, ship them to a log aggregator (Loki, CloudWatch, Datadog Logs), query logs to detect failures. This is what most Node.js apps do.

**Option B: Distributed tracing via OpenTelemetry.** Replace log-based observability with OTel traces and metrics. Use a PrivacySpanProcessor to strip sensitive data in-process. Export sanitised spans to Honeycomb. Define SLOs on trace data. Keep Pino only for local development — never ship logs to a third party.

### The privacy problem with logs

Pino already redacts `req.headers.authorization`, `req.headers.cookie`, `password`, `passwordHash`, `token`, `accessToken`, `refreshToken`, `secret`, and `apiKey` (see `utils/logger.ts`). But structured logs still contain:

| Field | PII Risk | Present in Pino HTTP logs |
|---|---|---|
| `req.url` | High — contains device IDs, user IDs in path (`/mail/abc-123`) | Yes |
| `req.remoteAddress` | High — client IP address | Yes |
| `req.headers.user-agent` | Medium — device fingerprinting | Yes |
| `res.statusCode` | None | Yes |
| `responseTime` | None | Yes |

If we ship these logs to any third party, we leak user metadata. If we self-host a log aggregator, we take on significant operational burden (Loki + Grafana, or ELK) for a 2-person team.

We could redact logs more aggressively, but then they lose diagnostic value — a log line that says `GET /[REDACTED] 500 42ms` from `[REDACTED]` is useless for debugging.

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

### No client instrumentation

We do not instrument the clients. No analytics SDKs, no crash reporting libraries, no telemetry beacons. The only client-originated data is a single HTTP header (`X-Vex-Client: desktop/0.3.1`) sent on requests the client already makes. No new network requests.

This matches Signal's approach — zero analytics SDKs, zero automated crash reporting. Crash reports are manual and user-initiated.

### Defence in depth

Even with this minimal collection, four layers prevent data leakage:

1. **SDK config** — disable unnecessary instrumentations (fs, dns, net), never enable header/body capture
2. **PrivacySpanProcessor** — strips `url.full`, `url.path`, `url.query`, `client.address`, `network.peer.address`, `user_agent.original`, `db.query.text` in-process before export
3. **OTel Collector** — allow-list mode (`allow_all_keys: false`), fail-closed. Last gate before data leaves infrastructure
4. **Honeycomb EU endpoint** — GDPR compliant, SOC 2 Type II, 60-day retention, encrypted at rest and in transit

## Decision

Adopt OpenTelemetry tracing as the primary observability mechanism. Do not ship logs to any third party.

- **Server (Spire):** OTel SDK with auto-instrumentation (HTTP, Express) + custom spans for mail delivery, key exchange, WebSocket lifecycle. PrivacySpanProcessor strips all sensitive attributes. Export via OTel Collector to Honeycomb EU.
- **Clients (desktop, mobile):** No instrumentation. A single `X-Vex-Client` header on existing HTTP requests provides client type and version.
- **Pino logging:** Retained for local development and stdout in production (for operators who self-host and want local logs). Never shipped to a third-party service. No change to existing Pino configuration.

## Rationale

1. **Privacy by architecture, not policy.** Tracing with an allow-list of 13 attributes is structurally safer than log redaction with a deny-list that must anticipate every possible sensitive field. Allow-lists fail closed. Deny-lists fail open.

2. **Observability without surveillance.** We know *that* a message was delivered (boolean), *how many* devices received it (count), and *which client version* sent it (string). We never know who sent it, who received it, or what it contained. This is sufficient for SLO calculation and regression detection.

3. **SLOs are first-class.** Honeycomb defines SLOs directly on span attributes. No log parsing, no regex extraction, no intermediate metrics pipeline. The SLI is `vex.mail.delivered == true` as a percentage of all `vex.mail.fanout` spans.

4. **Signal-grade client privacy.** Signal uses zero analytics SDKs. We match that. The `X-Vex-Client` header is less invasive than what HTTP already exposes (User-Agent) — and we strip User-Agent before export.

5. **Operational simplicity.** A 2-person team cannot operate a self-hosted log aggregator (Loki/ELK) alongside a tracing backend. Honeycomb Pro at $83/month replaces both, and the OTel Collector runs as a single sidecar process.

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
- No "we forgot to redact X in the logs" incidents. The allow-list prevents collection of anything not explicitly listed.
- Client privacy matches Signal's standard — zero telemetry SDKs, user-initiated crash reports only.

### Negative

- Cannot search production logs remotely. Must SSH into the server for recent log output.
- Custom spans require explicit instrumentation work for mail delivery, key exchange, and WebSocket lifecycle (estimated 4-6 custom spans total).
- Team must maintain the OTel Collector configuration and Honeycomb account.

## Revisit Triggers

- **Self-hosting requirement.** If users or regulators require that zero operational data leaves our infrastructure, migrate from Honeycomb to self-hosted SigNoz. The OTel instrumentation and Collector pipeline remain identical — only the exporter endpoint changes.
- **Debugging insufficiency.** If trace spans prove inadequate for production debugging and the team consistently needs log search, evaluate shipping redacted logs to a self-hosted Loki instance (never a third-party SaaS).
- **Scale beyond OTel Collector capacity.** If trace volume exceeds what a single Collector sidecar can process, evaluate Collector clustering or tail-based sampling.
