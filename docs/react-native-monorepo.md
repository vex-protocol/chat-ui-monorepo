# React Native + pnpm Monorepo

How to configure bare React Native inside this pnpm workspace. Covers Metro, TypeScript, Android Gradle, iOS CocoaPods, and common pitfalls.

---

## The Core Problem

pnpm's default isolation builds a virtual store under `.pnpm/` and places only direct dependencies (as symlinks) in each package's `node_modules/`. Metro was designed for npm/Yarn's flat `node_modules` — it climbs the directory tree and can load packages from the wrong location, causing duplicate React instances and "Invalid hook call" errors.

## Our Approach: pnpm isolation + Metro symlink support

We use pnpm's default isolated `node_modules` (no `node-linker=hoisted`). This preserves strict dependency isolation for desktop, spire, and all shared packages. Metro's built-in symlink support (RN ≥ 0.72) handles resolution for the mobile app.

Key requirements:
1. Metro config with `unstable_enableSymlinks: true` + `watchFolders` + `nodeModulesPaths`
2. Transitive deps that RN tooling expects must be explicit in `apps/mobile/package.json`
3. Pin singleton versions (e.g. `react`) via `pnpm.overrides` in root `package.json`

**Why not `node-linker=hoisted`?** It's a workspace-global setting — can't scope it to just the mobile app. Hoisting breaks pnpm's strict isolation for all packages, which is undesirable for the Tauri desktop app and spire server.

**Fallback:** If Metro symlink resolution causes issues (especially with Android Gradle), add `@rnx-kit/metro-resolver-symlinks` as a more battle-tested resolver. See the "Fallback: rnx-kit" section below.

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
    // RN 0.72+ symlink support — follows pnpm's symlinked node_modules
    unstable_enableSymlinks: true,

    // Respect package.json `exports` fields (needed for workspace packages)
    unstable_enablePackageExports: true,

    // App-local node_modules first, then workspace root for shared deps
    nodeModulesPaths: [
      path.resolve(projectRoot, 'node_modules'),
      path.resolve(workspaceRoot, 'node_modules'),
    ],
  },
})
```

**Key points:**
- `watchFolders: [workspaceRoot]` — Metro must see all source trees, including `packages/*`
- `unstable_enableSymlinks: true` — follows pnpm's symlinked `node_modules`
- `unstable_enablePackageExports: true` — respects `exports` fields in `packages/*/package.json`
- Do NOT set `disableHierarchicalLookup: true` — breaks pnpm's virtual store resolution

---

## Fallback: `@rnx-kit/metro-resolver-symlinks`

If Metro's built-in symlink support isn't sufficient (e.g. Gradle can't find scripts through symlinks), use Microsoft's resolver:

```bash
pnpm add -D @rnx-kit/metro-config @rnx-kit/metro-resolver-symlinks
```

```js
const { makeMetroConfig } = require("@rnx-kit/metro-config")
const MetroSymlinksResolver = require("@rnx-kit/metro-resolver-symlinks")

module.exports = makeMetroConfig({
  projectRoot: __dirname,
  watchFolders: [path.resolve(__dirname, '../..')],
  resolver: {
    resolveRequest: MetroSymlinksResolver(),
    nodeModulesPaths: [
      path.resolve(__dirname, 'node_modules'),
      path.resolve(__dirname, '../../node_modules'),
    ],
  },
})
```

---

## Explicit Transitive Dependencies

With pnpm isolation, RN tooling can't find transitive deps it expects to be hoisted. These must be explicit in `apps/mobile/package.json` devDependencies:

- `@react-native-community/cli`
- `@react-native-community/cli-platform-android`
- `@react-native-community/cli-platform-ios`
- `@react-native/gradle-plugin`
- `@react-native/codegen`
- `@babel/core`, `@babel/preset-env`, `@babel/runtime`

---

## `apps/mobile/react-native.config.js`

Required when the RN app is nested (not at the workspace root). Tells the RN CLI where to find `react-native`:

```js
// apps/mobile/react-native.config.js
module.exports = {
  reactNativePath: '../../node_modules/react-native',
}
```

---

## TypeScript Config

A standalone config with `moduleResolution: bundler` — more correct for Metro than the official base config's `commonjs`/`node`. Metro uses Babel for transpilation; TypeScript's `module` setting only affects type checking, not runtime. See `apps/mobile/tsconfig.json`.

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
  root = file("../../")
  reactNativeDir = file("../../../../node_modules/react-native")
  codegenDir = file("../../../../node_modules/@react-native/codegen")
  cliFile = file("../../../../node_modules/react-native/cli.js")
}
```

The generated paths from `react-native init` assume the app is at the repo root. Adjust `../` depth to match the actual nesting level.

---

## iOS CocoaPods Paths

The scaffolded Podfile uses Node's `require.resolve` to find paths dynamically, which works regardless of nesting depth:

```ruby
require Pod::Executable.execute_command('node', ['-p',
  'require.resolve("react-native/scripts/react_native_pods.rb",
    {paths: [process.argv[1]]})', __dir__]).strip
```

After scaffold, run `pod install` from `apps/mobile/ios/`.

---

## Common Pitfalls

| Symptom | Cause | Fix |
|---|---|---|
| Metro can't find `@babel/runtime` | Not an explicit dep | Add `@babel/runtime` to mobile's devDependencies |
| "Invalid hook call" / duplicate React | Two copies of `react` in bundle | `pnpm.overrides.react` in root `package.json` |
| Gradle: "Plugin not found" | `includeBuild` path wrong | Adjust `../` count for actual nesting depth |
| Metro errors for files outside projectRoot | `watchFolders` not set | Add `watchFolders: [workspaceRoot]` |
| `disableHierarchicalLookup: true` breaks resolution | Metro can't walk pnpm virtual store | Remove this option; use `nodeModulesPaths` instead |
| TypeScript `paths` aliases not working | Metro doesn't read `tsconfig.json` `paths` | Mirror them with `babel-plugin-module-resolver` |
| `.ios.ts` / `.android.ts` extensions not resolved | Wrong `moduleResolution` | Use `bundler` or `node`, never `node16`/`nodenext` |

---

## What We Do NOT Use

- **`node-linker=hoisted`** — breaks pnpm's strict isolation for the entire workspace. Not needed with Metro's symlink support.
- **Expo SDK** — no `expo-cli`, no EAS Build, no Expo managed workflow. OTA updates are out of scope.
- **Turborepo / Nx** — currently not adopted. Pure pnpm workspaces with workspace symlinks is sufficient.
- **`react-native-monorepo-config`** — optional Callstack helper that wraps Metro config. Not used here; the manual config above is simpler and more transparent.
- **`disableHierarchicalLookup`** — commonly found in old guides, breaks pnpm.
- **`@nanostores/svelte`** — does not exist on npm. Svelte apps use nanostores atoms natively via `.subscribe()`.
