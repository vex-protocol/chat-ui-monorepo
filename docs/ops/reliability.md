# Reliability: SLOs, Error Budgets, and Observability

How Vex Heavy Industries defines, measures, and defends reliability — without an SRE team.

> *"Hope is not a strategy."* — Google SRE Book

---

## Why This Matters

An encrypted chat app has an unusually high reliability bar. A dropped message isn't just annoying — it's a trust violation. Users chose E2E encryption because they care about security guarantees. If messages silently disappear, the security promise is meaningless regardless of how good the crypto is.

We are two developers and a designer. We cannot staff a 24/7 on-call rotation. Instead, we invest in observability, automated alerting, and a clear policy for when reliability degrades — so the system tells us when to stop shipping features and start fixing problems.

---

## The Hierarchy: SLI, SLO, SLA

| Concept | What It Is | Example |
|---|---|---|
| **SLI** (Service Level Indicator) | A measurement of one aspect of service health | "% of messages delivered successfully" |
| **SLO** (Service Level Objective) | A target for an SLI over a time window — internal engineering goal | "99.9% message delivery success over 30 days" |
| **SLA** (Service Level Agreement) | A contract with users, with consequences for missing it — external promise | "We guarantee 99.5% availability" |
| **Error Budget** | `1 - SLO` — the amount of failure you're allowed before action is required | 0.1% = 1 in 1,000 requests can fail per window |

SLIs feed SLOs. SLOs are stricter than SLAs (buffer for catching problems before they become contractual violations). Error budgets turn reliability from a vague goal into a measurable resource that gets spent and replenished.

---

## Our SLOs

Target: **three nines (99.9%)** on core SLIs, measured over a **30-day rolling window**.

### What Three Nines Means

| Period | Allowed Downtime |
|---|---|
| Per month | 43 minutes |
| Per week | ~10 minutes |
| Per year | 8 hours 46 minutes |

One bad deploy that takes the server down for 45 minutes exhausts the entire monthly budget.

### SLI Definitions

Start with two SLOs. Add more once we have baseline data (2-3 months of production telemetry).

| SLI | Definition | Target | Why This Matters |
|---|---|---|---|
| **Message delivery success** | % of sent messages that reach at least one recipient device | 99.9% | The #1 SLI. A chat app that drops messages is broken |
| **API availability** | % of HTTP requests returning non-5xx responses | 99.9% | Covers auth, key exchange, mail fetch, and all other endpoints |

### Future SLIs (add when baseline exists)

| SLI | Definition | Target | Notes |
|---|---|---|---|
| Message delivery latency (P95) | 95th percentile time from send to recipient ACK | <500ms | Users expect near-instant delivery |
| Key exchange success rate | % of X3DH key exchanges that complete without error | 99.9% | Failed exchange = conversation cannot start |
| WebSocket connection uptime | % of time connections remain alive and responsive | 99.5% | Persistent connections are inherently harder to keep stable |
| Reconnection success rate | % of dropped WebSocket connections that auto-recover | 99% | Measures client resilience, not just server health |

---

## Error Budget Policy

The error budget is the bridge between reliability and feature velocity. When budget is healthy, ship aggressively. When it's burning, the data tells you to stop and fix.

### Escalation Tiers

| Budget Remaining | Status | Actions |
|---|---|---|
| **>50%** | Healthy | Ship features from Now/Next freely. Deploy at normal cadence |
| **20–50%** | Caution | Review what's burning budget. Increase scrutiny on risky deploys. Prioritise reliability work alongside features |
| **1–20%** | Critical | Feature freeze — no deploys except P0 bugs and security fixes. All engineering effort on reliability |
| **0% (exhausted)** | Emergency | Full stop. No changes until budget recovers. Mandatory postmortem. Reliability item added to roadmap Now |

### Rules

- If a single incident consumes >20% of the monthly budget, conduct a postmortem within 48 hours
- If the same failure class burns >20% of budget two months running, add a P0 reliability item to `roadmap.md` Now
- The freeze ends when: the service is back within SLO, root causes are identified, and preventive steps are in place
- Disagreements about whether to freeze or resume are resolved by reviewing the burn rate dashboard together — the data decides

### How This Connects to the Roadmap

The error budget creates an automatic priority switch that interacts with the three-layer model:

```
Error budget healthy (>50%)          Error budget critical (<20%)
─────────────────────────            ─────────────────────────────
roadmap.md: ship from Now            roadmap.md: reliability items jump to Now
Linear: feature issues active         Linear: feature issues paused
beads: normal velocity                beads: reliability work only
```

Reliability work does not need to be pre-planned in `roadmap.md`. It activates on demand when burn rate alerts fire. Think of it as a standing "reliability lane" that takes priority over feature work when the data says so.

---

## Burn Rate Alerts

Burn rate = how fast you're consuming error budget relative to the 30-day window. A burn rate of 1 means you'll exactly exhaust budget at window end. Higher = faster.

### Alert Thresholds

| Severity | Burn Rate | Window | Budget Consumed at Alert | Action |
|---|---|---|---|---|
| **Page** (critical) | 14.4x | 1 hour | 2% | Wake someone up. Budget gone in ~2 days at this rate |
| **Page** (high) | 6x | 6 hours | 5% | Prompt attention. Budget gone in ~5 days |
| **Ticket** | 1x | 3 days | 10% | Create a Linear issue. Slow bleed that needs investigation |

Each alert uses a **long window** (detects sustained issues) paired with a **short window** (1/12th of long — confirms the issue is current, not historical). The alert fires only when both windows exceed the threshold. This prevents alerting on brief spikes and keeps alerts from lingering after a fix.

### Fast Burn vs Slow Burn

- **Fast burn** (14.4x, 1-hour window): "The server is down right now." Catastrophic failure, immediate response
- **Slow burn** (1x, 3-day window): "We have a memory leak slowly increasing error rates." Gradual degradation that would drain the budget before the window ends

### Starting Simple

For a 2-person team, start with **one alert**: notify (Slack or PagerDuty) when the budget would be exhausted within 24 hours. Add the multi-window matrix once you understand your failure modes.

---

## Observability Stack

### Privacy-First Instrumentation

Vex is an E2E encrypted chat app built by people who don't trust third parties with user data. Our observability must follow the same principle: **collect only what is needed for SLOs and debugging, nothing more.**

> *"Prevention over remediation — avoiding sensitive data collection entirely is superior to filtering it afterward."* — OpenTelemetry Security Docs

#### What We Collect (allow-list)

| Attribute | Source | Why We Need It |
|---|---|---|
| `http.request.method` | Auto (HTTP instrumentation) | Distinguish GET/POST for debugging |
| `http.response.status_code` | Auto (HTTP instrumentation) | **Required for API availability SLI** |
| `http.route` | Auto (Express instrumentation) | Route pattern (e.g., `/mail/:deviceID`), not actual path. Needed for per-endpoint breakdown |
| `error.type` | Auto (HTTP instrumentation) | Error class for root cause analysis |
| `service.name` | SDK config | Identifies Spire in traces |
| `service.version` | SDK config | Correlate deploys to regressions |
| `vex.mail.delivered` | Custom span | **Required for message delivery SLI** — boolean, no content |
| `vex.mail.device_count` | Custom span | How many devices a message fanned out to — count, no IDs |
| `vex.ws.event` | Custom span | WebSocket lifecycle event type (connect, auth, disconnect) — no payload |
| `vex.keys.bundle_ok` | Custom span | Key bundle assembly success/failure — boolean, no key material |
| `vex.keys.otk_remaining` | Custom metric | OTK pool depth — count, no device identity |
| `vex.client.type` | `X-Vex-Client` header | Client platform (desktop, mobile) — for per-platform SLI breakdown |
| `vex.client.version` | `X-Vex-Client` header | Client version (e.g., 0.3.1) — correlate regressions to releases |

#### What We Explicitly Do NOT Collect

| Attribute | Default Behaviour | Our Action | Why |
|---|---|---|---|
| `url.full` | Collected by HTTP instrumentation | **Strip** | Contains device IDs, user IDs in path |
| `url.path` | Collected by HTTP instrumentation | **Strip** | Same — `/mail/abc-123` reveals device identity |
| `url.query` | Collected by HTTP instrumentation | **Strip** | Could contain tokens or search terms |
| `client.address` | Collected by HTTP instrumentation | **Strip** | Client IP address — never acceptable |
| `network.peer.address` | Collected by HTTP instrumentation | **Strip** | Peer IP address |
| `user_agent.original` | Collected by HTTP instrumentation | **Strip** | Device fingerprinting vector |
| `db.query.text` | Collected by DB instrumentation | **Strip** | Reveals schema and access patterns |
| `db.query.parameter.*` | Opt-in only | **Never enable** | Actual query values |
| Request/response headers | Opt-in only | **Never enable** | Auth tokens, cookies |
| Request/response bodies | Not collected by default | **Never enable** | Message ciphertext, key material |
| User IDs, device IDs | Not collected by default | **Never add as span attributes** | Correlatable to specific users |
| Message IDs, conversation IDs | Not collected by default | **Never add as span attributes** | Correlatable to specific conversations |

**The principle:** We know *that* a message was delivered (boolean). We know *how many* devices received it (count). We know *which client version* sent it (string). We never know *who* sent it, *who* received it, or *what* it contained.

#### Client-Side: No Instrumentation

We do not instrument the clients. No analytics SDKs, no crash reporting libraries, no telemetry beacons. This is the same approach Signal takes — they use zero analytics SDKs and rely on manual, user-initiated debug log submission.

The server already sees every HTTP request and WebSocket connection. The only client-originated data we add is a single header (`X-Vex-Client: desktop/0.3.1`) sent on requests the client already makes. This rides on existing traffic — no new network requests, no phoning home.

What this gives us:
- If desktop v0.3.1 has a key exchange bug, server spans show `vex.client.version: 0.3.1` correlated with `vex.keys.bundle_ok: false`
- If mobile has worse delivery rates than desktop, per-platform SLI breakdown reveals it
- "Should we force-update old clients?" becomes data-driven

What this does NOT do:
- No user identity (not tied to any user or device ID)
- No device fingerprinting (no OS version, screen size, locale)
- No usage analytics (no feature tracking, session duration, screen views)
- No crash reporting (users submit debug logs voluntarily, like Signal)

#### Defence in Depth

Privacy is enforced at three layers. If one fails, the next catches it.

```
Spire (Node.js)
  │
  ├── Layer 1: SDK Configuration
  │   ├── Disable unnecessary instrumentations (fs, dns, net)
  │   ├── HTTP instrumentation: ignoreIncomingRequestHook for /health
  │   └── Custom spans use only allowed attributes (no IDs)
  │
  ├── Layer 2: PrivacySpanProcessor
  │   └── Strips url.full, url.path, url.query, client.address,
  │       network.peer.address, user_agent.original, db.query.text
  │       BEFORE export — data never leaves the process
  │
  ├── Layer 3: OTel Collector (privacy gateway)
  │   ├── Redaction processor: allow-list mode (fail-closed)
  │   │   Only explicitly listed attributes pass through
  │   ├── Filter processor: drop health check spans entirely
  │   └── Runs on our infrastructure — last line before data leaves
  │
  └── Layer 4: Honeycomb EU endpoint
      └── api.eu1.honeycomb.io — GDPR, SOC 2 Type II, DPA
          60-day retention, encrypted at rest and in transit
```

Layer 2 (PrivacySpanProcessor) is the critical one. It runs in-process and strips sensitive attributes before they reach the exporter. Even if auto-instrumentation adds something unexpected in a future OTel update, the processor catches it.

Layer 3 (Collector) is the safety net. Running in allow-list mode (`allow_all_keys: false`), it drops any attribute not explicitly permitted. This is fail-closed — new attributes are blocked by default.

### Single-Box Architecture

Our target deployment is one Linux box running Spire + SQLite. No Kubernetes, no container orchestration, no microservices. The OTel SDK exports directly to Honeycomb — no Collector process needed.

```
┌─────────────────────────────────────────────────┐
│ Single Linux Box                                │
│                                                 │
│  Spire (Node.js)                                │
│    ├── auto-instrumentation (HTTP, Express, Pino)│
│    ├── PrivacySpanProcessor (strips PII)        │
│    ├── runtime-node (heap, event loop, GC)      │
│    ├── host-metrics (CPU, memory, network)      │
│    ├── custom SQLite metrics (WAL, db size)      │
│    └── OTLP exporter ──────────────────────────────> api.eu1.honeycomb.io
│                                                 │
│  SQLite (spire.db + WAL)                        │
│                                                 │
│  UptimeRobot ←── external ping to /health ──────│── uptimerobot.com
└─────────────────────────────────────────────────┘
```

**Why no Collector:** For a single process exporting to a single backend, the Collector adds a process to manage with minimal benefit. The PrivacySpanProcessor already strips sensitive data in-process. If you ever need the Collector (host disk metrics, privacy gateway), add it as a systemd service and change one env var (`OTEL_EXPORTER_OTLP_ENDPOINT` from Honeycomb to `localhost:4318`). App code doesn't change.

**External uptime check:** If the server is down, OTel is down too. UptimeRobot (free, 50 monitors, 5-min checks) pings `/health` from outside and alerts via Slack/email. This catches: process crash, network down, VM dead, TLS cert expired.

### OpenTelemetry Setup

**Packages:**

| Package | Purpose |
|---|---|
| `@opentelemetry/sdk-node` | Core SDK |
| `@opentelemetry/auto-instrumentations-node` | Auto-instrument Express, HTTP. Includes `instrumentation-runtime-node` for heap, event loop, GC metrics |
| `@opentelemetry/sdk-trace-base` | Custom SpanProcessor (privacy layer) |
| `@opentelemetry/sdk-metrics` | Metrics Views (attribute allow-list) |
| `@opentelemetry/exporter-trace-otlp-http` | Export traces via OTLP |
| `@opentelemetry/exporter-metrics-otlp-http` | Export metrics via OTLP |
| `@opentelemetry/instrumentation-pino` | Inject trace_id/span_id into Pino log output (with `disableLogSending: true`) |
| `@opentelemetry/host-metrics` | CPU, memory, network metrics from the OS (runs in-process via Node's `os` module) |

**Initialisation:** An `instrumentation.ts` file loads before the app via Node's `--import` flag (`node --import ./instrumentation.ts run.ts`). This ensures all auto-instrumentation hooks are registered before Express, HTTP, and the database driver are imported.

**Disabled instrumentations:** `fs`, `dns`, `net` — these generate high-volume, low-value spans that don't serve any SLI.

**Pino integration:** `@opentelemetry/instrumentation-pino` with `disableLogSending: true` injects `trace_id` and `span_id` into Pino log lines. No log data is exported — Pino writes to stdout as before, now enriched with trace context for local log-trace correlation. No `LoggerProvider` is configured. See [ADR-002](../architecture/adr-002-tracing-over-logging.md) for the full rationale.

**Error handling:** Errors are attached to spans, not shipped as logs. The error middleware calls `span.recordException(err)` and `span.setStatus(ERROR)` on the active span. The exception event rides with the trace through the existing pipeline. Pino still logs the error to stdout for local visibility (with trace_id auto-injected). No separate log exporter or log pipeline exists.

**Production log level:** `LOG_LEVEL=error` in production. This is a security hardening measure — if an attacker compromises the server, stdout contains only generic error messages ("Not found", "Unauthorized"), not HTTP request URLs with user IDs or WebSocket connection details. Operational visibility comes from OTel spans, which are exported via OTLP and never written to the local filesystem. Development uses `info` or `debug` freely.

### Host and Runtime Metrics

Collected in-process alongside traces. No Collector required.

**Node.js runtime** (via `instrumentation-runtime-node`, included in `auto-instrumentations-node`):

| Metric | Type | Why it matters |
|---|---|---|
| `nodejs.eventloop.delay.p99` | Gauge | Event loop saturation — if this climbs, the server is overloaded |
| `nodejs.eventloop.utilization` | Gauge | Ratio 0.0–1.0. Approaching 1.0 = no headroom |
| `v8js.memory.heap.used` | Gauge | Growing over time = memory leak |
| `v8js.gc.duration` | Histogram | Long/frequent GC pauses degrade latency |

**Host** (via `@opentelemetry/host-metrics`):

| Metric | Type | Why it matters |
|---|---|---|
| `system.cpu.utilization` | Gauge | Box-level CPU pressure |
| `system.memory.utilization` | Gauge | Approaching 1.0 = OOM risk |
| `process.memory.usage` | Gauge | Spire process RSS |

Note: `@opentelemetry/host-metrics` does not collect disk or filesystem metrics — those require the OTel Collector's `hostmetricsreceiver`. For disk-full alerts, use a custom gauge (see SQLite metrics below) or Netdata.

### SQLite Metrics

No off-the-shelf OTel package provides SQLite health metrics. We build it using better-sqlite3's `.pragma()` method and the OTel metrics API.

**Query duration:** Knex emits `query-response` events with duration data. Feed this into an OTel histogram (`vex.db.query_duration`). No extra dependency needed — Knex already has this hook.

**Health metrics** (polled every 30–60 seconds via OTel observable gauges):

| Metric | Source | Type | Alert threshold |
|---|---|---|---|
| `vex.db.size_bytes` | `fs.statSync('spire.db').size` | Gauge | Approaching disk capacity |
| `vex.db.wal_size_bytes` | `fs.statSync('spire.db-wal').size` | Gauge | > 50 MB (checkpoint starvation) |
| `vex.db.page_count` | `db.pragma('page_count', { simple: true })` | Gauge | Growth tracking |
| `vex.db.freelist_count` | `db.pragma('freelist_count', { simple: true })` | Gauge | > 10% of page_count = wasted space |
| `vex.db.busy_errors` | Increment on SQLITE_BUSY in error handler | Counter | Any occurrence |
| `vex.disk.free_bytes` | `fs.statfsSync(dbPath)` | Gauge | < 20% free = critical |

The WAL size is the most important single metric. If it grows without bound, checkpointing is failing — likely due to long-running read transactions holding the WAL open. This directly threatens data integrity.

**What we do NOT use:** `opentelemetry-plugin-better-sqlite3` (community tracing package, 3 stars). It auto-instruments driver methods with spans, but captures `db.statement` (the full SQL query) as a span attribute — a privacy concern. Knex's event system gives us query duration without exposing query text.

### Instrumentation Points in Spire

How each SLI gets measured, mapped to the actual codebase.

#### SLI 1: Message Delivery Success

**Where:** `mail.service.ts` — `saveMail()` and the WebSocket `send()` call in `mail.routes.ts`

```
POST /mail
  │
  ├── saveMail(db, payload)          ← span: vex.mail.save
  │     outcome: ok | error
  │
  ├── connManager.send(device, msg)  ← span: vex.mail.deliver
  │     per recipient device
  │     outcome: delivered | offline
  │
  └── parent span: vex.mail.fanout
        attributes:
          vex.mail.delivered: true/false
          vex.mail.device_count: N (integer)
          vex.mail.offline_count: N (integer)
```

**What gets measured:** Did the save succeed? How many devices were online to receive the push? The SLI is `vex.mail.delivered == true` as a percentage of all `vex.mail.fanout` spans.

**What is NOT captured:** Sender ID, recipient ID, device IDs, message content, nonce, ciphertext, headers.

#### SLI 2: API Availability

**Where:** Auto-instrumented by `@opentelemetry/instrumentation-http` and `@opentelemetry/instrumentation-express`. No custom code needed.

**What gets measured:** `http.response.status_code < 500` as a percentage of all HTTP spans. Broken down by `http.route` for per-endpoint visibility.

**What is NOT captured:** Full URL path (stripped by PrivacySpanProcessor), query parameters, client IP, user agent.

#### Future: Key Exchange Success

**Where:** `keys.service.ts` — `getKeyBundle()`

```
GET /keys/:deviceID
  │
  ├── getPreKey(db, deviceID)        ← span: vex.keys.prekey
  ├── consumeOTK(db, deviceID)       ← span: vex.keys.otk_consume
  │
  └── parent span: vex.keys.bundle
        attributes:
          vex.keys.bundle_ok: true/false
          vex.keys.otk_available: true/false
```

**What is NOT captured:** The deviceID parameter, key material, public keys, signatures.

#### Future: WebSocket Connection Health

**Where:** `ws.service.ts` — `handleConnection()`

```
WebSocket connect
  │
  ├── challenge sent                 ← span: vex.ws.challenge
  ├── auth response received         ← span: vex.ws.auth
  │     outcome: authenticated | rejected | timeout
  ├── heartbeat loop                 ← metric: vex.ws.active_connections (gauge)
  │
  └── disconnect                     ← span: vex.ws.disconnect
        attributes:
          vex.ws.event: connect | auth | disconnect
          vex.ws.auth_ok: true/false
          vex.ws.duration_ms: N (connection lifetime)
          vex.ws.close_code: N (WebSocket close code)
```

**What is NOT captured:** Device ID, IP address, user agent, auth signature.

#### OTK Pool Depth (Early Warning)

**Where:** `devices.routes.ts` — `GET /device/:id/otk/count`

A gauge metric (`vex.keys.otk_pool_depth`) recorded after each OTK count query and after each OTK consumption. No device identity — just the count. Alerts when pool approaches zero across any device (aggregate).

### Honeycomb

Honeycomb receives sanitised OTel data via OTLP and provides querying, SLO tracking, and burn rate alerts.

**Why Honeycomb over Datadog/Grafana:**

| Aspect | Traditional Monitoring | Honeycomb |
|---|---|---|
| Data model | Pre-aggregated metrics | Raw, wide structured events |
| Debugging | Dashboard → logs → grep | Query → BubbleUp → trace |
| High-cardinality queries | Slow or impossible | Sub-second, first-class |
| SLO support | Varies | Built-in with burn alerts |

The killer feature is **BubbleUp**: when a burn alert fires, Honeycomb automatically compares failing events against passing events across every dimension and surfaces *why* things are failing. Root cause in minutes without prior knowledge of the failure mode.

**Endpoint:** `api.eu1.honeycomb.io` (EU data residency). GDPR compliant, SOC 2 Type II audited, DPA included in terms. 60-day data retention.

**Pricing:**

| Plan | Cost | Events/month | SLOs |
|---|---|---|---|
| Free | $0 | 20M | No |
| Pro | $130/month | 100M | Yes — burn alerts, error budgets |

**Event volume estimates for a single-box deployment:**

| Active users | Traces/month | Metrics/month | Total | Fits Free? |
|---|---|---|---|---|
| 100 | ~1M | ~400K | ~1.4M | Yes |
| 500 | ~9M | ~400K | ~9.4M | Yes |
| 1,000 | ~18M | ~400K | ~18.4M | Borderline |

Start on Free to build baseline data. The free tier covers us well into hundreds of users. Move to Pro when ready to enforce SLOs.

**Privacy trade-off:** Honeycomb is a third-party SaaS. We accept this because: (1) the data they receive contains no user identity, no message content, no IP addresses — only operational booleans and counts; (2) the PrivacySpanProcessor strips sensitive attributes in-process before export; (3) the self-hosted alternatives (SigNoz, Grafana Stack) require operating ClickHouse or Prometheus+Tempo+Loki, which is a full-time job for a 2-person team.

### Self-Hosted Alternative

If the privacy trade-off ever becomes unacceptable:

**SigNoz** (self-hosted) is the most viable alternative. It accepts OTLP natively, has built-in SLO dashboards with burn-rate alerts, and covers traces + metrics + logs in one tool. The cost is operational: managing ClickHouse, handling upgrades, monitoring the monitoring system.

We would graduate to self-hosted only if: (a) we have more than 2 engineers, or (b) users or regulators require that no operational data leaves our infrastructure.

---

## Minimum Viable Practice

Skip the full Google SRE ceremony. A 2-person team needs the essentials, not the bureaucracy.

### Phase 1: Instrument (day one)

1. Add OpenTelemetry to Spire — `instrumentation.ts` loaded via `--import`
2. Auto-instrument HTTP + Express + Pino (trace ID injection)
3. Add `@opentelemetry/host-metrics` for CPU/memory
4. Add custom spans for message delivery and key exchange
5. Add SQLite health metrics (WAL size, db size, busy errors via PRAGMA + `fs.statSync`)
6. Export directly to Honeycomb Free — no Collector
7. Set up UptimeRobot to ping `/health` externally
8. Observe. Build baseline data. Don't set targets yet

**Cost:** $0. **New processes:** 0.

### Phase 2: Define (after 30 days of data)

1. Review baseline data. What are the actual success rates and latencies?
2. Set SLO targets based on observed performance (not aspirational numbers)
3. Upgrade to Honeycomb Pro ($130/month)
4. Create two SLOs: message delivery success + API availability
5. Set one burn alert: notify when budget exhausts within 24 hours

### Phase 3: Enforce

1. Add burn rate alerts to Slack
2. Run a monthly 15-minute SLO review: how much budget did we use? What caused it?
3. First real enforcement: if budget drops below 20%, feature freeze until recovery

### Phase 4: Expand (when needed)

- Add OTel Collector as a systemd service for disk/filesystem metrics and privacy gateway
- Add Netdata for local host dashboard if Honeycomb's infrastructure view is insufficient
- Add SLIs as the product matures (latency, WebSocket, key exchange)

### Ongoing

- Monthly SLO review (15 minutes)
- Postmortem within 48 hours for any incident consuming >20% of budget
- Revisit targets quarterly — if you're always at 99.99%, the target is too loose and you're over-investing in reliability

---

## How This Connects to Everything Else

| System | Relationship |
|---|---|
| **Roadmap** (`roadmap.md`) | Reliability items enter Now when error budget policy triggers. Items in Done can regress back to Now if SLOs reveal breakage |
| **Journeys** (`journeys.md`) | SLIs map to journeys — message delivery = Journey 4/5, key exchange = Journey 4, API availability = all journeys |
| **Linear** | Burn rate ticket alerts create Linear issues. Feature freeze pauses feature issues |
| **Beads** | Reliability work tracked as beads like any other implementation work |

```
Single Box
┌──────────────────────────────────┐
│ Spire + OTel SDK                 │
│   traces + metrics               │──── OTLP/HTTP ────> Honeycomb EU
│   PrivacySpanProcessor           │                         │
│   SQLite health (PRAGMA polls)   │                         ├── SLO dashboard
└──────────────────────────────────┘                         ├── Burn alerts (Slack)
                                                             └── BubbleUp (root cause)
UptimeRobot ──── /health ping ────> Alert if down                   │
                                                                    v
                                                          Error budget policy
                                                                    │
                                                          ┌─────────┼─────────┐
                                                          v         v         v
                                                      roadmap.md  Linear    beads
```

---

## Success Metrics

- SLOs defined and tracked within 2 months of production launch
- Mean time to detect (MTTD) reliability issues: under 5 minutes via burn alerts
- Mean time to root cause: under 30 minutes using Honeycomb BubbleUp
- Zero months where budget is exhausted without a postmortem
- Feature freeze events are rare (<1 per quarter) because proactive monitoring catches issues early
