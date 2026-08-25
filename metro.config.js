const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')

const config = getDefaultConfig(__dirname)

/**
 * `spikes/` holds a second, self-contained Expo project (S-1/S-2). Without this
 * Metro walks into its node_modules and collides on duplicate copies of React
 * Native. Remove this block when the spike is deleted.
 */
config.resolver.blockList = [
  new RegExp(`${path.resolve(__dirname, 'spikes').replace(/[/\\\\]/g, '[/\\\\\\\\]')}.*`),
]

config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs']

module.exports = config
