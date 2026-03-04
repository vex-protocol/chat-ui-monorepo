/**
 * Generates framework-specific Storybook CSF wrappers.
 *
 * Mitosis copies *.stories-shared.ts into output/react/src/ and output/svelte/src/
 * alongside the compiled components. This script writes a thin wrapper next to
 * each one that adds `component:` to the default export.
 *
 * For each src/{Name}/{Name}.stories-shared.ts, writes:
 *   output/react/src/{Name}/{Name}.stories.tsx
 *   output/svelte/src/{Name}/{Name}.stories.ts
 */
import { readdirSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const srcDir = join(root, 'src')

const components = readdirSync(srcDir)

for (const name of components) {
  const sharedFile = join(srcDir, name, `${name}.stories-shared.ts`)
  if (!existsSync(sharedFile)) continue

  // React wrapper — co-located with compiled component
  const reactOut = join(root, `output/react/src/${name}/${name}.stories.tsx`)
  if (existsSync(join(root, `output/react/src/${name}/${name}.tsx`))) {
    writeFileSync(
      reactOut,
      `import { meta } from './${name}.stories-shared'\nimport ${name} from './${name}'\n\nexport * from './${name}.stories-shared'\nexport default { ...meta, component: ${name} }\n`,
    )
    console.log(`  ✓ ${name} (react)`)
  }

  // Svelte wrapper — co-located with compiled component
  const svelteOut = join(root, `output/svelte/src/${name}/${name}.stories.ts`)
  if (existsSync(join(root, `output/svelte/src/${name}/${name}.svelte`))) {
    writeFileSync(
      svelteOut,
      `import { meta } from './${name}.stories-shared'\nimport ${name} from './${name}.svelte'\n\nexport * from './${name}.stories-shared'\nexport default { ...meta, component: ${name} }\n`,
    )
    console.log(`  ✓ ${name} (svelte)`)
  }
}

console.log('Story wrappers generated.')
