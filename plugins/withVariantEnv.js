const fs = require('node:fs')
const path = require('node:path')
const { withDangerousMod } = require('expo/config-plugins')

/**
 * Writes the build's variant and its EXPO_PUBLIC_* values into ios/.xcode.env.
 *
 * Why: `EXPO_PUBLIC_*` is inlined when the JS bundle is built. For a Release or
 * an archive, that happens inside Xcode's "Bundle React Native code" phase,
 * which sources ios/.xcode.env and otherwise falls back to the `.env` file on
 * disk. Without this, the backend an archive talks to would be whatever `.env`
 * held on the day it was made — the risk `scripts/env.mjs` was written to
 * catch. With it, the backend is fixed when the native project is generated,
 * by `scripts/variant.mjs <target> --prebuild`, and the prebuilt project
 * carries it. Variables already in the environment win over `.env`, so these
 * exports take precedence.
 *
 * ios/ is generated and gitignored, so nothing here is committed.
 */
const MARKER = '# [luna] build variant — written by plugins/withVariantEnv.js'

const shellQuote = (value) => `'${String(value).replace(/'/g, `'\\''`)}'`

module.exports = function withVariantEnv(config) {
  return withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const file = path.join(cfg.modRequest.platformProjectRoot, '.xcode.env')
      const existing = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''
      const kept = existing.split(MARKER)[0].trimEnd()

      const vars = {
        APP_VARIANT: process.env.APP_VARIANT === 'production' ? 'production' : 'development',
        // `prebuild --clean` deletes .xcode.env.local, which is where the nvm
        // node path lived; Xcode's own PATH does not have it. The node running
        // this prebuild is the right one.
        NODE_BINARY: process.execPath,
      }
      for (const [key, value] of Object.entries(process.env)) {
        if (key.startsWith('EXPO_PUBLIC_') && value !== undefined) vars[key] = value
      }
      const exports = Object.entries(vars)
        .map(([key, value]) => `export ${key}=${shellQuote(value)}`)
        .join('\n')

      fs.writeFileSync(file, `${kept}\n\n${MARKER}\n${exports}\n`)
      return cfg
    },
  ])
}
