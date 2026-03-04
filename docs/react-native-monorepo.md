# React Native + pnpm Monorepo

How to configure bare React Native inside this pnpm workspace. Covers Metro, TypeScript, Android Gradle, iOS CocoaPods, and common pitfalls.

---

## The Core Problem

pnpm's default isolation builds a virtual store under `.pnpm/` and places only direct dependencies (as symlinks) in each package's `node_modules/`. Metro was designed for npm/Yarn's flat `node_modules` — it climbs the directory tree and can load packages from the wrong location, causing duplicate React instances and "Invalid hook call" errors.

Two strategies exist. We use Strategy A.

---

## Strategy A: `node-linker=hoisted` (our choice)

Add to the **root** `.npmrc`:

```ini
node-linker=hoisted
```

This makes pnpm produce a flat `node_modules` like npm/Yarn. Metro, Gradle, and CocoaPods all work without any symlink gymnastics. The tradeoff — you lose pnpm's strict isolation — is acceptable for a mobile app project where the native toolchain (Gradle, CocoaPods) also assumes flat layouts.

Also pin singleton versions to prevent duplicates:

```json
// root package.json
{
  "pnpm": {
    "overrides": {
      "react": "18.3.1"
    }
  }
}
```

## Strategy B: Default pnpm isolation + Metro symlink config

Keep pnpm's default, configure Metro with `unstable_enableSymlinks: true` + `nodeModulesPaths`. More complex, more edge cases. Details in the `metro.config.js` section below. Not used here but documented for reference.

---

## `apps/mobile/metro.config.js`

This is the most important file. Must be created as part of the scaffold.

```js
// apps/mobile/metro.config.js
const path = require('path')
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config')

const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, '../..')

module.exports = mergeConfig(getDefaultConfig(projectRoot), {
  watchFolders: [workspaceRoot],

  resolver: {
    // Stable as of RN 0.73; option name retained for compatibility
    unstable_enableSymlinks: true,

    // Respect package.json `exports` fields (needed for workspace packages)
    unstable_enablePackageExports: true,

    // App-local node_modules first, then workspace root for hoisted deps
    nodeModulesPaths: [
      path.resolve(projectRoot, 'node_modules'),
      path.resolve(workspaceRoot, 'node_modules'),
    ],
  },
})
```

**Key points:**
- `watchFolders: [workspaceRoot]` — Metro must see all source trees, including `packages/*`
- `unstable_enableSymlinks: true` — required even with `node-linker=hoisted` when workspace symlinks exist
- `unstable_enablePackageExports: true` — respects `exports` fields in `packages/*/package.json`
- Do NOT set `disableHierarchicalLookup: true` — breaks pnpm's virtual store resolution

**If using Strategy B (default pnpm isolation)**, add an `extraNodeModules` Proxy to force app-local copies of singletons:

```js
resolver: {
  // ...above settings...
  extraNodeModules: new Proxy(
    {},
    {
      get: (_target, name) =>
        path.join(projectRoot, 'node_modules', String(name)),
    }
  ),
},
```

---

## `apps/mobile/react-native.config.js`

Required when the RN app is nested (not at the workspace root). Tells the RN CLI where to find `react-native` and `@react-native-community/cli-platform-ios`:

```js
// apps/mobile/react-native.config.js
module.exports = {
  reactNativePath: '../../node_modules/react-native',
}
```

If you have workspace-internal packages with native code (currently none), add them to `dependencies`:

```js
module.exports = {
  reactNativePath: '../../node_modules/react-native',
  dependencies: {
    '@vex-chat/native-module': {
      root: path.join(__dirname, '../../packages/native-module'),
    },
  },
}
```

---

## TypeScript Config

The official `@react-native/typescript-config` package provides the base tsconfig for RN 0.73+:

```json
{
  "extends": "@react-native/typescript-config/tsconfig.json",
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "allowImportingTsExtensions": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

The official base sets `"module": "commonjs"`, `"jsx": "react-native"`, `"moduleResolution": "node"`, `"noEmit": true`, `"isolatedModules": true`.

**Alternative (our current setup):** A standalone config with `moduleResolution: bundler` is also valid and arguably more correct for Metro (it understands `package.json` exports maps natively). Metro uses Babel for transpilation — TypeScript's `module` setting only affects type checking, not runtime. See `apps/mobile/tsconfig.json`.

**Avoid `moduleResolution: node16` or `nodenext`** — they require file extensions in imports, which breaks RN's platform-specific extension resolution (`.ios.ts`, `.android.ts`).

---

## Workspace Package Resolution

When `apps/mobile` declares `"@vex-chat/store": "workspace:*"`:

1. pnpm writes a symlink: `apps/mobile/node_modules/@vex-chat/store` → `packages/store`
2. Metro follows the symlink (via `unstable_enableSymlinks`)
3. Metro reads `packages/store/package.json` → follows `exports["."]` or `main` to `src/index.ts`
4. Metro bundles the source directly — **no build step needed for workspace packages**

For this to work, workspace packages must point `main`/`exports` to source files:

```json
// packages/store/package.json
{
  "main": "src/index.ts",
  "exports": { ".": "./src/index.ts" }
}
```

---

## Android Gradle Paths

When the app lives at `apps/mobile/` (two levels deep), the Android build files need adjusted paths. Run `grep -r "node_modules/react-native"` after init to find all occurrences:

**`apps/mobile/android/settings.gradle`**
```gradle
pluginManagement {
  includeBuild("../../../node_modules/@react-native/gradle-plugin")
}
```

**`apps/mobile/android/app/build.gradle`**
```gradle
react {
  reactNativeDir = file("../../../node_modules/react-native")
  codegenDir = file("../../../node_modules/@react-native/codegen")
  cliFile = file("../../../node_modules/react-native/cli.js")
}
```

The generated paths from `react-native init` assume the app is at the repo root. Adjust `../` depth to match the actual nesting level.

---

## iOS CocoaPods Paths

**`apps/mobile/ios/Podfile`**
```ruby
require_relative '../../../node_modules/react-native/scripts/react_native_pods'
require_relative '../../../node_modules/@react-native-community/cli-platform-ios/native_modules'
```

After adjusting paths, run `pod install` from `apps/mobile/ios/`.

---

## Scaffold Approach

`npx react-native@latest init` generates the app at the current working directory. Two options:

**Option A:** Run init outside the monorepo, then move the output into `apps/mobile/`. Adjust all relative paths in Gradle and Podfile.

**Option B:** Run init directly at `apps/mobile/` with `--directory apps/mobile` flag, rename `package.json#name` to `@vex-chat/mobile`. This is cleaner.

After scaffold:
1. Add `node-linker=hoisted` to root `.npmrc` if not already present
2. Create/update `metro.config.js` per above
3. Create `react-native.config.js` per above
4. Fix Android Gradle paths
5. Fix iOS Podfile paths
6. `pnpm install` from workspace root
7. `cd apps/mobile/ios && pod install`

---

## Common Pitfalls

| Symptom | Cause | Fix |
|---|---|---|
| Metro can't find `@babel/runtime` | pnpm doesn't hoist it | `node-linker=hoisted` in root `.npmrc` |
| "Invalid hook call" / duplicate React | Two copies of `react` in bundle | `pnpm.overrides.react` in root `package.json` |
| Gradle: "Plugin not found" | `includeBuild` path wrong | Adjust `../` count for actual nesting depth |
| CocoaPods: "cannot load such file" | CLI platform package not in flat `node_modules` | `node-linker=hoisted` |
| Metro errors for files outside projectRoot | `watchFolders` not set | Add `watchFolders: [workspaceRoot]` |
| `disableHierarchicalLookup: true` breaks resolution | Metro can't walk pnpm virtual store | Remove this option; use `nodeModulesPaths` instead |
| TypeScript `paths` aliases not working | Metro doesn't read `tsconfig.json` `paths` | Mirror them with `babel-plugin-module-resolver` |
| `.ios.ts` / `.android.ts` extensions not resolved | Wrong `moduleResolution` | Use `bundler` or `node`, never `node16`/`nodenext` |

---

## What We Do NOT Use

- **Expo SDK** — no `expo-cli`, no EAS Build, no Expo managed workflow. OTA updates are out of scope.
- **Turborepo / Nx** — currently not adopted. Pure pnpm workspaces with workspace symlinks is sufficient.
- **`react-native-monorepo-config`** — optional Callstack helper that wraps Metro config. Not used here; the manual config above is simpler and more transparent.
- **`disableHierarchicalLookup`** — commonly found in old guides, breaks pnpm.
- **`@nanostores/svelte`** — does not exist on npm. Svelte apps use nanostores atoms natively via `.subscribe()`.
