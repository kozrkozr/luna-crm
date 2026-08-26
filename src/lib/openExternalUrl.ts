import { Linking } from 'react-native'

/**
 * Open a URL outside the app, in whatever the platform hands it to.
 *
 * `US-003` AC-3 requires it for a link reference; `US-018` uses it for a
 * location video, which has no in-app player (see docs/open-questions.md #19).
 *
 * `canOpenURL` first, so a stored URL the OS cannot handle fails silently
 * instead of throwing. Nothing specifies an error state for this, and inventing
 * one would be inventing a requirement; links reaching here already passed
 * `US-003` AC-2's http(s) check on the way in, and signed media URLs are ours.
 */
export async function openExternalUrl(url: string): Promise<void> {
  try {
    if (await Linking.canOpenURL(url)) await Linking.openURL(url)
  } catch {
    /* nothing specified for an unopenable URL */
  }
}
