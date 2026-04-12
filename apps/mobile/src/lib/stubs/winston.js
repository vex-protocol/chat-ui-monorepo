// Stub winston for React Native.
//
// libvex@2.0.0's main index imports Client.js, which imports
// utils/createLogger.js, which imports winston. winston pulls in
// "os" (Node builtin) plus "fs", "net", "tls", etc. — none of which
// React Native provides. Metro dies at bundle time.
//
// libvex should use a platform-agnostic logger (or gate winston
// behind conditional exports). Until it does, this stub returns a
// winston-shaped object whose loggers forward to console and whose
// format/transports factories return empty objects — enough to
// satisfy libvex's module load without ever running winston's
// Node-dependent code.
//
// Wired up from apps/mobile/metro.config.js via config.resolver
//   .resolveRequest(...) — Metro redirects every import of "winston"
// to this file at bundle time.
//
// Remove this stub (and the resolver entry) when libvex stops
// unconditionally importing winston.

const noopLogger = {
    info: (...args) => {
        console.info("[libvex]", ...args);
    },
    error: (...args) => {
        console.error("[libvex]", ...args);
    },
    warn: (...args) => {
        console.warn("[libvex]", ...args);
    },
    debug: (...args) => {
        console.debug("[libvex]", ...args);
    },
    log: (...args) => {
        console.log("[libvex]", ...args);
    },
    verbose: (...args) => {
        console.log("[libvex]", ...args);
    },
    silly: () => {},
    http: (...args) => {
        console.log("[libvex]", ...args);
    },
    add: () => noopLogger,
    remove: () => noopLogger,
    clear: () => noopLogger,
    close: () => noopLogger,
};
// A child logger in winston inherits parent context — returning the
// same noop instance is fine for mobile since we're forwarding to
// console either way.
noopLogger.child = () => noopLogger;

// Format/transport factories return empty objects — libvex's
// createLogger.js calls e.g. `winston.format.combine(...)` at module
// load. As long as the call doesn't throw, we're fine.
const emptyFormat = () => ({});
const format = {
    combine: emptyFormat,
    timestamp: emptyFormat,
    colorize: emptyFormat,
    printf: emptyFormat,
    json: emptyFormat,
    simple: emptyFormat,
    label: emptyFormat,
    splat: emptyFormat,
    errors: emptyFormat,
    padLevels: emptyFormat,
    prettyPrint: emptyFormat,
    uncolorize: emptyFormat,
    logstash: emptyFormat,
    metadata: emptyFormat,
    ms: emptyFormat,
    align: emptyFormat,
    cli: emptyFormat,
};

// Transport constructors used with `new winston.transports.Console(...)`
// — a no-op class satisfies instantiation.
function NoopTransport() {}

module.exports = {
    createLogger: () => noopLogger,
    format,
    transports: {
        Console: NoopTransport,
        File: NoopTransport,
        Http: NoopTransport,
        Stream: NoopTransport,
    },
    addColors: () => {},
    loggers: {
        add: () => noopLogger,
        get: () => noopLogger,
        has: () => false,
        close: () => {},
    },
    // Default export interop — some libvex callers do
    // `import winston from 'winston'` which resolves to `default`.
    default: null,
};
module.exports.default = module.exports;
