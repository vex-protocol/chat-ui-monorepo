const path = require('path')
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config')

const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, '../..')

module.exports = mergeConfig(getDefaultConfig(projectRoot), {
  watchFolders: [workspaceRoot],

  resolver: {
    unstable_enableSymlinks: true,
    unstable_enablePackageExports: true,
    nodeModulesPaths: [
      path.resolve(projectRoot, 'node_modules'),
      path.resolve(workspaceRoot, 'node_modules'),
    ],
  },
})
