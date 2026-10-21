import { Image } from 'react-native'

const MOON = require('../../assets/paywall-logo.png')

/**
 * The product mark — the App Store icon's moon, white on transparent, the same
 * file the paywall shows. Replaced the «L» letter on the sign-in screen, the
 * web sidebar and the link views' bar (`US-057` AC-3, owner 2026-10-21).
 *
 * `size` is the height; the file is 217 × 226, so the width follows.
 */
export function LogoMark({ size }: { size: number }) {
  return (
    <Image
      source={MOON}
      style={{ width: Math.round((size * 217) / 226), height: size }}
      resizeMode="contain"
      accessibilityIgnoresInvertColors
    />
  )
}
