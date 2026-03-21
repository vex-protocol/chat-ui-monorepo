# Spire Scalability & Performance

## Current Architecture

Spire is a single-process Node.js server (Express 4 + `express-ws`) backed by SQLite via Knex. It serves both HTTP REST endpoints and a WebSocket endpoint on the same port (`16777`). All state lives either in SQLite on disk or in two in-process `Map` objects.

### State Inventory

| State | Location | Scope |
|---|---|---|
| Users, devices, keys, mail, servers, channels, permissions | SQLite file | Persistent, survives restart |
| WebSocket connections (`Map<deviceID, socket>`) | Process memory | Lost on restart |
| Action tokens (registration, file upload, avatar) | Process memory (`Map`) | Lost on restart, swept every 5 min |
| JWT sessions | Stateless (client-held tokens) | No server-side state |

### Message Flow

Spire uses a **store-and-forward** model. Messages are E2EE ciphertext blobs — the server never sees plaintext.

```
Sender → POST /device/:deviceID/mail → INSERT into mail table → 200 OK

Recipient → GET /mail/:deviceID → SELECT + DELETE (atomic) → returns mail array
```

The WebSocket layer handles device authentication (Ed25519 challenge-response) and heartbeats but does **not currently push mail to online recipients**. The `onMail` callback hook exists in `ws.service.ts` but the delivery-to-recipient wiring is not connected in `run.ts`.

---

## Single-Server Performance Profile

### What's Fast

- **WebSocket auth**: Ed25519 verify via `@noble/curves` — ~0.1ms, pure JS, negligible.
- **JWT verification**: HS256 HMAC via `jose` — negligible.
- **SQLite reads**: `better-sqlite3` is synchronous and runs in-process with no network round-trip. Single-reader queries return in microseconds for small datasets.
- **WebSocket send to known device**: O(1) Map lookup + `ws.send()`.

### Where It Slows Down

| Bottleneck | Impact | Mitigation |
|---|---|---|
| **argon2id on login/register** | ~50–100ms, allocates 19 MiB per call. Runs on libuv thread pool (4 threads default). Concurrent logins queue behind the thread pool. | Global rate limiter (500 req / 15 min). Increase `UV_THREADPOOL_SIZE` if login throughput matters. |
| **SQLite single-writer lock** | All writes serialize globally. Under write-heavy load (many messages), writes queue behind each other. Reads are unaffected (WAL mode would help if enabled). | Acceptable for low-to-moderate load. WAL mode (`PRAGMA journal_mode=WAL`) would allow concurrent reads during writes. |
| **No live push** | Recipients must poll `GET /mail/:deviceID`. Every poll is a DB read + delete. Frequent polling from many clients amplifies read load unnecessarily. | Wire the `onMail` WebSocket callback to push to online recipients, falling back to store-and-forward for offline devices. |
| **Mail table growth** | If recipients don't fetch mail, rows accumulate indefinitely. No TTL or expiry on mail rows. | Add a periodic cleanup job or a `created_at` column with TTL-based expiry. |

### Realistic Single-Server Limits

For a SQLite-backed single-process server:

- **Concurrent WebSocket connections**: ~10,000–50,000 (limited by file descriptors and memory; each `ws` connection is lightweight)
- **Message throughput (writes)**: ~1,000–5,000 inserts/sec with WAL mode, ~100–500/sec without (write serialization)
- **Concurrent logins**: ~40/sec (4 libuv threads × ~100ms per argon2id call)
- **HTTP request throughput**: ~5,000–10,000 req/sec for read-only endpoints (Express + SQLite reads)

These numbers are adequate for hundreds to low thousands of active users. SQLite with WAL mode on modern hardware is far more capable than most people assume.

---

## Scaling Without Kubernetes — The SQLite-First Path

The goal is to extract maximum performance from a single server before adding infrastructure complexity. Kubernetes, Postgres, Redis — these are tools you reach for when you've exhausted simpler options, not before. WhatsApp served 500 million users on ~550 servers. Telegram runs 1B+ MAU with ~30 engineers. Signal handles ~100K req/sec on straightforward Java services. None of them started with Kubernetes.

### Phase 1 — Maximize the Single Process

**Zero new infrastructure. Just make what exists work properly.**

#### 1a. Enable WAL Mode

SQLite's default journal mode serializes all access. WAL (Write-Ahead Logging) allows concurrent readers during writes and increases write throughput 5–10x.

```typescript
// In createDb, after connection
db.executeQuery(sql`PRAGMA journal_mode=WAL`.compile(db));
db.executeQuery(sql`PRAGMA synchronous=NORMAL`.compile(db)); // safe with WAL
db.executeQuery(sql`PRAGMA busy_timeout=5000`.compile(db));   // wait 5s on contention instead of failing
```

With WAL + `synchronous=NORMAL`, SQLite on an SSD can sustain **5,000–10,000 writes/sec** while serving unlimited concurrent reads. This alone pushes the ceiling from hundreds to thousands of active users.

#### 1b. Wire WebSocket Live Push

The biggest performance win available. Right now every recipient polls via HTTP, which means:
- Unnecessary HTTP request overhead per message
- A DB read + delete on every poll
- Latency proportional to poll interval

The `onMail` callback and `connectionManager.send()` already exist. Wire them together in `run.ts`:

```typescript
// When mail arrives via HTTP POST
const recipientSocket = connectionManager.get(recipientDeviceID);
if (recipientSocket) {
  // Push immediately over WebSocket — skip the DB entirely for online recipients
  recipientSocket.send(JSON.stringify(mailPayload));
} else {
  // Offline — store-and-forward as today
  await saveMail(db, mailPayload);
}
```

This eliminates the DB write *and* the DB read for every message between online users. The mail table becomes a queue only for offline devices — dramatically reducing DB load.

This is exactly what Signal does: WebSocket push for online, store-and-forward for offline, push notification as wake signal.

#### 1c. Increase libuv Thread Pool

```bash
UV_THREADPOOL_SIZE=16 node dist/run.js
```

Default is 4 threads. argon2id runs on this pool. With 16 threads, concurrent login throughput goes from ~40/sec to ~160/sec.

#### 1d. Add Mail TTL

```sql
ALTER TABLE mail ADD COLUMN createdAt TEXT DEFAULT (datetime('now'));
```

Run a periodic cleanup (every hour) to delete stale mail older than 30 days:

```typescript
setInterval(() => {
  db.deleteFrom('mail')
    .where('createdAt', '<', sql`datetime('now', '-30 days')`)
    .execute();
}, 3600_000);
```

#### 1e. Client Reconnect with Exponential Backoff

When the server restarts, all WebSocket connections drop. Without reconnect logic, users see the app as broken. Add to the client:

```typescript
function connect() {
  const ws = new WebSocket(url);
  let backoff = 1000;
  ws.onclose = () => {
    setTimeout(() => { backoff = Math.min(backoff * 2, 30000); connect(); }, backoff);
  };
  ws.onopen = () => { backoff = 1000; };
}
```

**Phase 1 result**: Single server handles **1,000–5,000 concurrent users** with sub-100ms message delivery for online users. Zero new infrastructure. Zero new dependencies.

---

### Phase 2 — Vertical Scaling

**Still one server. Make it bigger.**

#### 2a. Bigger Machine

A $40/month VPS (4 vCPU, 8 GB RAM) handles this workload trivially. A $160/month dedicated server (8 cores, 32 GB RAM, NVMe SSD) could handle 10,000–20,000 concurrent WebSocket connections with headroom.

SQLite's memory footprint is small. The real memory consumers are:
- WebSocket connections: ~10–50 KB each (with `ws` library). 10,000 connections ≈ 100–500 MB.
- argon2id: 19 MiB per concurrent login. 16 concurrent logins ≈ 300 MB.
- Node.js baseline: ~50–100 MB.

**10,000 concurrent connections fit comfortably in 4 GB of RAM.**

#### 2b. Node.js Cluster Mode (Multiple Workers, One Machine)

Node.js `cluster` module forks multiple worker processes sharing the same port. Each worker gets its own event loop — this is how you use all CPU cores.

**The catch**: each worker has its own `clients` Map. A message arriving at Worker 1 can't be delivered to a WebSocket on Worker 2.

**Solution**: Use the cluster IPC channel (built into Node.js, zero dependencies) as the pub/sub backplane:

```typescript
import cluster from 'node:cluster';

if (cluster.isPrimary) {
  // Fork workers
  for (let i = 0; i < numCPUs; i++) cluster.fork();

  // Relay messages between workers
  for (const worker of Object.values(cluster.workers!)) {
    worker.on('message', (msg) => {
      // Broadcast to all other workers
      for (const other of Object.values(cluster.workers!)) {
        if (other !== worker) other.send(msg);
      }
    });
  }
} else {
  // Worker process — runs full spire server
  // When sending to a device not in our local Map:
  process.send!({ type: 'relay', deviceID, payload });
  // Listen for relayed messages from other workers:
  process.on('message', (msg) => {
    if (msg.type === 'relay') connectionManager.send(msg.deviceID, msg.payload);
  });
}
```

**The SQLite problem**: `better-sqlite3` is safe to use from multiple processes *if* WAL mode is enabled. Each worker opens its own connection to the same SQLite file. WAL mode handles concurrent readers natively, and the write lock serializes writes across processes. This works — SQLite was designed for this.

**The token store problem**: Move to SQLite. Replace the in-memory Map with a `tokens` table:

```sql
CREATE TABLE tokens (
  tokenID TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  expiresAt TEXT NOT NULL
);
CREATE INDEX idx_tokens_expires ON tokens(expiresAt);
```

All workers share the same SQLite file, so tokens created by Worker 1 are visible to Worker 2.

**Phase 2 result**: 4–8 workers on one machine, **5,000–20,000 concurrent users**, all CPU cores utilized, no external dependencies. SQLite handles the write serialization. IPC handles cross-worker message delivery.

---

### Phase 3 — Multiple Servers (Still SQLite)

This is where you'd normally hear "switch to Postgres." But there's a SQLite-native path that avoids introducing a database server.

#### Option A: LiteFS (Distributed SQLite)

[LiteFS](https://github.com/superfly/litefs) is a FUSE-based replication layer for SQLite built by Fly.io. It provides:
- One primary node that accepts writes
- N read replicas that get sub-second replication
- Automatic primary election via Consul or a static lease

```
                    ┌──────────────┐
                    │   HAProxy    │
                    │  (TCP/HTTP)  │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
        ┌─────┴─────┐ ┌───┴─────┐ ┌───┴─────┐
        │  Spire 1  │ │ Spire 2 │ │ Spire 3 │
        │ (primary) │ │(replica)│ │(replica)│
        │  writes   │ │  reads  │ │  reads  │
        └─────┬─────┘ └───┬─────┘ └───┬─────┘
              │            │            │
        ┌─────┴─────┐ ┌───┴─────┐ ┌───┴─────┐
        │  LiteFS   │ │ LiteFS  │ │ LiteFS  │
        │  (FUSE)   │ │ (FUSE)  │ │ (FUSE)  │
        └─────┬─────┘ └────┬────┘ └────┬────┘
              │             │           │
              └─────────────┴───────────┘
                    LiteFS replication
```

**Write path**: All writes route to the primary. Replicas forward write requests to the primary via LiteFS's built-in proxy or your load balancer routes writes to the primary.

**Read path**: All nodes serve reads from their local SQLite copy. Replication lag is typically <100ms.

**Cross-server WebSocket routing**: At this point, you need a lightweight pub/sub between servers. Options without adding Redis:
- **NATS** (single binary, ~10 MB, zero configuration) — lighter than Redis, purpose-built for pub/sub
- **Unix domain sockets or TCP** between the spire processes directly
- **SQLite itself as a message bus** — write to a `relay` table, poll with `CHANGES()` — crude but functional for low volume

#### Option B: Turso (Managed SQLite)

[Turso](https://turso.tech) provides libSQL (a fork of SQLite) as a managed service with:
- Embedded replicas: each spire instance keeps a local SQLite copy for reads
- Writes go to the remote primary over HTTP
- Sub-100ms replication to local replicas
- No FUSE, no filesystem tricks — just a different DB driver

This is the lowest-friction path to multi-server SQLite. Replace `better-sqlite3` with `@libsql/client` and update the Knex configuration. All existing queries work unchanged because libSQL is SQLite-compatible.

#### Cross-Server Concerns

Regardless of which SQLite distribution option you pick, you still need:

1. **Cross-server WebSocket routing**: A message arriving at Server 1 for a device connected to Server 2 must be relayed. Use NATS, Redis, or direct TCP between spire instances.

2. **Shared token store**: With distributed SQLite, the `tokens` table from Phase 2 replicates automatically. Problem solved.

3. **Sticky sessions for WebSocket upgrades**: Your load balancer (HAProxy, nginx, Caddy) must route WebSocket upgrade requests consistently. Use IP hash or a connection cookie.

**Phase 3 result**: 2–5 servers, **10,000–50,000+ concurrent users**, still SQLite, still simple. One pub/sub dependency (NATS or Redis) for cross-server WebSocket relay.

---

### Phase 4 — When You Actually Need More

At this point (50,000+ concurrent users, heavy write load), the SQLite write serialization becomes the real bottleneck. *Now* you consider:

- **PostgreSQL**: Add a `DB_TYPE=postgres` path. Knex supports Postgres natively — add the `pg` driver and configure the connection. Connection pooling handles concurrent writes.
- **Redis**: If not already added for pub/sub, add it now for token store + session cache + rate limiting.
- **Kubernetes**: Only if you need auto-scaling, rolling deploys, and you have the ops team to run it. Otherwise, a few well-provisioned VMs behind a load balancer work fine.

**This phase is probably years away for a project that hasn't had much load.**

---

## What the Big Players Do

### Signal — Store-and-Forward with Redis Backplane

| Aspect | Detail |
|---|---|
| Language | Java (Dropwizard) |
| Database | DynamoDB (messages, 7-day TTL) + FoundationDB + Redis (write-through cache) |
| Real-time | WebSocket push for online devices; Redis Pub/Sub for cross-server routing |
| Offline delivery | Store in Redis first (Lua scripts, atomic enqueue), async flush to DynamoDB |
| Mobile wake | APNs/FCM push notification as "wake signal" — client opens WS and pulls queued messages |
| Key distribution | Prekey server (X3DH → PQXDH with CRYSTALS-Kyber post-quantum KEM) |
| Scale | ~100,000 req/sec, ~$14M/year infra, tens of millions DAU |
| Deployment | Multi-cloud (AWS + GCP + Azure), no public Kubernetes config |
| Team size | Small nonprofit, ~50 employees total |

**Key insight**: Signal's server is architecturally simple. Dropwizard (synchronous Java), Redis for coordination, DynamoDB for persistence. No reactive frameworks, no actor models, no clustering frameworks. They scale through infrastructure (more instances + Redis) rather than application-level complexity. The server is a dumb relay — all intelligence is in the client-side Signal Protocol.

**Relevant to spire**: Spire's architecture is almost identical to Signal's conceptual model — store-and-forward E2EE relay with prekey distribution. The difference is that Signal uses Redis Pub/Sub for cross-server WebSocket routing where spire uses an in-process Map. Adding Redis (or NATS) as a backplane is the single change that unlocks multi-server.

### WhatsApp — Erlang/BEAM, In-Memory Everything

| Aspect | Detail |
|---|---|
| Language | Erlang on BEAM VM (heavily patched OTP) |
| Protocol | FunXMPP — binary-encoded XMPP dialect (~50–70% smaller than XML) |
| Database | Mnesia (Erlang's built-in distributed in-memory DB), ~2 TB RAM across cluster |
| Connections | One lightweight Erlang process per connection; **2 million connections per server** |
| Routing | Mnesia lookup: user → server node. Microsecond latency, all in RAM. |
| Offline | Messages queued in Mnesia until recipient reconnects, then drained |
| Sharding | 16 Mnesia partitions, 32 fragments per table, consistent hash on user ID |
| Presence | In-memory on frontend nodes, 30s heartbeat, debounced broadcast |
| Typing indicators | Ephemeral, never persisted, dropped if recipient offline |
| Scale | 2B+ users, 40B+ messages/day, ~550 servers with 11,000 cores (at 500M users) |
| Deployment | FreeBSD, bare metal (SoftLayer → Facebook DCs), 40,000-node Erlang cluster |
| Team size | Reached 1B users with ~50 total engineers |

**Key insight**: WhatsApp's genius was choosing Erlang. The BEAM VM gives you an actor model with millions of lightweight processes, distributed messaging between nodes, hot code reloading (deploy without disconnecting users), and crash isolation (one process dying doesn't affect others). Mnesia gives you a distributed in-memory database with no external dependency. The entire stack is one technology — Erlang all the way down.

**Relevant to spire**: WhatsApp validates that a messaging server's core job is simple — route messages between connected clients and queue for offline ones. The complexity is in doing it at scale with reliability. Spire's Node.js single-process model can't match BEAM's per-connection process isolation, but it doesn't need to until tens of thousands of concurrent users. The store-and-forward model is the same. The key takeaway: **don't add infrastructure until the single server is full**.

### Discord — Elixir/BEAM + Rust + ScyllaDB

| Aspect | Detail |
|---|---|
| Language | Elixir (real-time gateway), Rust (data services, hot paths), Python (API) |
| Connections | One Elixir GenServer process per connected user (Session), one per guild (Guild) |
| Fanout | Guild process → Relay processes (15K sessions each) → Session processes. For large guilds (1M+ members), 90% of sessions are "passive" and skip most events. |
| Pub/sub | **The BEAM cluster itself** — Erlang distributed messaging, no external broker |
| Database | ScyllaDB (messages, C++ Cassandra rewrite, no JVM GC), PostgreSQL (metadata), Redis (cache) |
| Presence | In-memory in guild/session processes; Rust NIF SortedSet for member lists (0.6μs insert at 1M items) |
| Scale | 11M+ concurrent users, 3.2M messages/sec peak, trillions of stored messages |
| Deployment | Google Cloud (GKE/Kubernetes), Cloudflare (edge) |

**Key insight**: Discord's critical scaling innovation was **passive session filtering** — recognizing that 90% of users in a large guild aren't actively looking at it and don't need real-time updates. This single optimization reduced fanout work by 90%. They also avoid external message brokers entirely for real-time delivery — the BEAM cluster *is* the message bus.

**Relevant to spire**: Discord's architecture is overkill for spire's scale, but the passive session concept matters. If spire ever supports large servers/channels, don't broadcast every event to every connected member. Only push to users actively viewing that channel.

### Telegram — C++, Custom Protocol, Multi-DC

| Aspect | Detail |
|---|---|
| Language | C++ (server, closed source), Erlang (proxy tier) |
| Protocol | MTProto 2.0 — custom binary, AES-256-IGE, 2048-bit DH keys |
| Transport | TCP (default), WebSocket, HTTP; obfuscation layer defeats DPI censorship |
| Sessions | Device-bound (64-bit session ID), not connection-bound. Multiple TCP connections per session. Responses can return on any open connection. |
| Update delivery | Server-push over persistent TCP. Each user has a PTS sequence; each channel has its own independent PTS. Gap detection triggers `getDifference` RPC. |
| Message storage | Cloud-based (server holds keys, split across jurisdictions). NOT E2EE by default. Secret Chats are true E2EE but device-specific, no sync. |
| Data centers | 5 DCs (Miami ×2, Amsterdam ×2, Singapore). No shared encryption keys between DCs. User assigned to DC at registration by phone country code. |
| CDN | Encrypted CDN for channels >100K members. AES-256-CTR encrypted blobs, memory-only LRU on edge nodes, one-way push from master DC. |
| Large groups | Channels/supergroups have independent message boxes (own PTS sequence). Lazy fan-out — subscribers fetch on open, not pushed proactively. This avoids writing to millions of user journals per message. |
| Scale | 1B+ MAU, 70B+ messages/day |
| Team size | ~30 engineers, ~60 total employees |

**Key insight**: Telegram's most relevant architectural decision is **independent message boxes per channel**. Instead of fan-out writing to every subscriber's event journal (which would be O(subscribers) writes per message), each channel maintains its own append-only log. Subscribers read from it lazily. This is how they handle channels with millions of members without melting their database.

**Relevant to spire**: If spire ever supports public channels or large groups, adopt Telegram's model: give each channel its own message stream rather than copying messages into each recipient's mailbox. For 1:1 E2EE messaging (spire's current model), the store-and-forward-per-device approach is correct and matches what both Signal and WhatsApp do.

---

## Comparison: What They All Have in Common

| Pattern | Signal | WhatsApp | Discord | Telegram | Spire (current) |
|---|---|---|---|---|---|
| Push to online, queue for offline | Yes | Yes | Yes | Yes | **No** (poll only) |
| In-memory connection routing | Redis Pub/Sub | Mnesia (RAM) | BEAM cluster | In-process | In-process Map |
| Messages deleted after delivery | Yes (7-day TTL) | Yes (device is store) | No (permanent) | No (cloud store) | Yes (on fetch) |
| E2EE | Always | Always | No | Opt-in (Secret Chats) | Always |
| External message broker | Redis | None (Erlang) | None (BEAM) | Unknown | None |
| Started with Kubernetes | No | No | No | No | N/A |

**The universal pattern**: Push to online clients over persistent connections, store-and-forward for offline. Every major messaging platform does this. Spire's missing piece is wiring the WebSocket push path — once that's done, the architecture matches the industry standard.

---

## Scaling Decision Tree

```
                        Are you hitting limits?
                              │
                    ┌─────────┴──────────┐
                    No                   Yes
                    │                    │
              Don't change         What's the bottleneck?
              anything.            │
                              ┌────┼─────────────┐
                              │    │             │
                           Writes  Connections   CPU
                              │    │             │
                        Enable WAL  Vertical     UV_THREADPOOL_SIZE
                              │    scale (more   │
                         Still?    RAM, better   Still?
                              │    NIC)          │
                        Cluster    │             Cluster mode
                        mode       Still?        (more workers)
                              │    │             │
                         Still?    Cluster mode  Still?
                              │    (more workers)│
                        Multiple   │             Multiple
                        servers    Still?        servers
                        (LiteFS/   │             │
                        Turso)     Multiple      Still?
                              │    servers +     │
                         Still?    load balancer  Consider
                              │    │              Postgres
                        Now         Still?
                        consider    │
                        Postgres.   Now consider
                                    Kubernetes.
```

---

## Summary

| Phase | What Changes | Concurrent Users | New Dependencies |
|---|---|---|---|
| **Now** | Nothing | ~100–500 | None |
| **1: Optimize single process** | WAL mode, WebSocket push, UV threads, mail TTL | ~1,000–5,000 | None |
| **2: Vertical + cluster** | Bigger machine, Node.js cluster, IPC relay, tokens in SQLite | ~5,000–20,000 | None |
| **3: Multiple servers** | LiteFS or Turso, NATS or Redis for WS relay, load balancer | ~10,000–50,000+ | LiteFS/Turso + NATS or Redis |
| **4: Outgrow SQLite** | PostgreSQL, Redis, maybe Kubernetes | ~50,000+ | PostgreSQL + Redis |

The key principle: **don't add infrastructure until you've exhausted what you have**. Every dependency you add is a dependency you have to operate, monitor, and debug at 3 AM. WhatsApp got to 500 million users on Erlang + Mnesia + FreeBSD. Signal runs on Java + Redis + DynamoDB. Telegram serves a billion users with 30 engineers. Start simple, measure, scale what's actually slow.

---

See also: [infrastructure.md](infrastructure.md) for provider selection.
