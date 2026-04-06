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

module.exports = config
