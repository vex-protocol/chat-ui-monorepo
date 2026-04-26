// Stub Node https module for React Native bundle graph.
//
// Kept separate from node-http.js to mirror Node's module split and keep
// resolver mappings explicit in metro.config.js.

function UnsupportedAgent() {
    throw new Error(
        "node:https Agent is unavailable on React Native. " +
            "This module is a bundle-time stub.",
    );
}

function unsupportedCall() {
    throw new Error(
        "node:https APIs are unavailable on React Native. " +
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
