const path = require('path')
const { getDefaultConfig } = require('expo/metro-config')

const projectRoot = __dirname
const monorepoRoot = path.resolve(projectRoot, '../..')

// Sibling repos linked via pnpm workspace (outside the monorepo root)
const siblingRepos = [
  path.resolve(monorepoRoot, '../libvex-js'),
  path.resolve(monorepoRoot, '../crypto-js'),
  path.resolve(monorepoRoot, '../types-js'),
]

const config = getDefaultConfig(projectRoot)

config.watchFolders = [monorepoRoot, ...siblingRepos]
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
  // Sibling repos' own node_modules (for their transitive deps)
  ...siblingRepos.map(r => path.resolve(r, 'node_modules')),
]
config.resolver.unstable_enableSymlinks = true
config.resolver.unstable_enablePackageExports = true

// @noble/hashes@1.8.0 internally imports "./crypto.js" but its exports map
// only lists "./crypto". This causes a noisy Metro warning on every import.
// Resolve it directly to suppress the warning.
const originalResolveRequest = config.resolver.resolveRequest
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@noble/hashes/crypto.js' || moduleName.endsWith('@noble/hashes/crypto.js')) {
    return context.resolveRequest(context, '@noble/hashes/crypto', platform)
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform)
  }
  return context.resolveRequest(context, moduleName, platform)
}

module.exports = config
