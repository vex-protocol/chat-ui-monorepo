# Zod + Binary Data: How to Handle Uint8Array in Schemas

> Research date: 2026-04-08
> Updated: 2026-04-08 (post-implementation)
> Context: Vex protocol types have `Uint8Array` fields (encryption keys, ciphertexts, nonces).

---

## The Problem

`z.instanceof(Uint8Array)` has two issues:
1. **Cannot serialize to JSON Schema** — `z.toJSONSchema()` can't represent JavaScript class instances
2. **TS 6 generic variance** — `z.instanceof(Uint8Array)` infers `Uint8Array<ArrayBuffer>` but tweetnacl returns `Uint8Array<ArrayBufferLike>`, causing assignment errors

## What We Researched

### z.codec() (Zod 4.1)
The research recommended `z.codec()` to define hex-string ↔ Uint8Array bidirectional transforms. This would have given us:
- Wire format: hex string (JSON Schema compatible)
- Runtime format: Uint8Array
- Single schema, two representations via `z.toJSONSchema(schema, { io: 'input' })`

### Why We Didn't Use Codecs

1. **Vex uses msgpack, not JSON.** The wire format for Uint8Array fields is msgpack binary (not hex strings). A codec that transforms hex ↔ Uint8Array doesn't match the actual protocol.
2. **Crypto types moved to libvex.** `IXKeyRing`, `IPreKeysCrypto`, `ISessionCrypto` moved out of `@vex-chat/types` entirely — they never need JSON Schema.
3. **OpenAPI/AsyncAPI generation works without codecs.** We use `z.toJSONSchema()` with `unrepresentable: "any"` for the spec generation scripts. Uint8Array fields appear as `{}` in the JSON Schema output, which is acceptable since the actual transport is msgpack binary, not JSON.

## What We Actually Implemented

### `z.custom<Uint8Array<any>>()` helper

```typescript
// schemas/common.ts
export const uint8 = z.custom<Uint8Array<any>>(
    (val) => val instanceof Uint8Array,
);
```

**Why `Uint8Array<any>`:**
- `z.instanceof(Uint8Array)` infers `Uint8Array<ArrayBuffer>` which is not assignable from tweetnacl's `Uint8Array<ArrayBufferLike>`
- `z.custom<Uint8Array>()` (no generic) also infers `Uint8Array<ArrayBuffer>` in TS 6
- `z.custom<Uint8Array<ArrayBufferLike>>()` fails the other direction (can't assign `Uint8Array<ArrayBuffer>` to it)
- `Uint8Array<any>` accepts both directions — it's assignable from and to any Uint8Array variant

### Usage in schemas

```typescript
// schemas/keys.ts
export const mailWS = z.object({
    cipher: uint8.describe("Encrypted message content"),
    nonce: uint8.describe("Encryption nonce"),
    // ...
});

// schemas/messages.ts
export const challMsg = baseMsg.extend({
    challenge: uint8.describe("Challenge nonce bytes"),
});
```

### Spec generation

For OpenAPI/AsyncAPI, `z.toJSONSchema()` is called with `unrepresentable: "any"`:
```typescript
const jsonSchema = z.toJSONSchema(schema, { unrepresentable: "any" });
```

Uint8Array fields become `{}` in the output. This is acceptable because:
- The protocol uses msgpack over WebSocket, not JSON over HTTP
- Consumers use the TypeScript SDK, not raw JSON Schema
- The JSON Schema describes the *shape* of messages for documentation, not for validation

### Future: If We Move to JSON-based Transport

If we ever switch from msgpack to JSON (hex-encoded binary), we would:
1. Switch `uint8` to a `z.codec()` as originally researched
2. Use `z.toJSONSchema(schema, { io: 'input' })` for the wire format
3. The codec's `encode`/`decode` would handle hex ↔ Uint8Array conversion

This would be a protocol-level change, not just a schema change.

---

## Sources

- [Zod Codecs documentation](https://zod.dev/codecs)
- [Zod JSON Schema documentation](https://zod.dev/json-schema)
- [Zod v4 release notes](https://zod.dev/v4)
- [Zod #5327: z.instanceof() in codec + toJSONSchema()](https://github.com/colinhacks/zod/issues/5327)
