// Stub Node http module for React Native bundle graph.
//
// libvex's Node-only agent helper imports "node:http". Metro may still
// resolve that path during graph build even though runtime guards prevent use.
// This stub satisfies resolution and fails loudly if executed.

function UnsupportedAgent() {
    throw new Error(
        "node:http Agent is unavailable on React Native. " +
            "This module is a bundle-time stub.",
    );
}

function unsupportedCall() {
    throw new Error(
        "node:http APIs are unavailable on React Native. " +
            "This module is a bundle-time stub.",
    );
}

module.exports = {
    Agent: UnsupportedAgent,
    get: unsupportedCall,
    request: unsupportedCall,
    globalAgent: {},
};
module.exports.default = module.exports;
