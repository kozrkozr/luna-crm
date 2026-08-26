const { getDefaultConfig } = require('expo/metro-config')
const { withNativeWind } = require('nativewind/metro')

const config = getDefaultConfig(__dirname)

config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs']

/**
 * `inlineRem: 16` per React Native Reusables' setup: NativeWind otherwise
 * inlines its own default rem, and the component sources are written against 16.
 */
module.exports = withNativeWind(config, { input: './src/theme/global.css', inlineRem: 16 })
