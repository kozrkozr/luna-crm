const { withEntitlementsPlist } = require('expo/config-plugins')

/**
 * Removes the `aps-environment` entitlement that `expo-notifications` adds.
 *
 * Why: Expo applies that package's config plugin automatically — it is on
 * prebuild-config's list of versioned SDK plugins, so it runs whether or not
 * this app lists it — and the plugin always writes `aps-environment`, which is
 * the Push Notifications capability. `US-041` uses **local** notifications only:
 * the phone schedules them itself and never receives a push, so it does not
 * need the capability. Keeping it made a device build fail outright
 * (2026-10-05): the development signing profile is the wildcard
 * "iOS Team Provisioning Profile: *", and a wildcard profile cannot carry push.
 *
 * Why this wins: plugins registered later wrap the earlier ones, and a mod runs
 * its own action before handing on to the one it wraps. Expo registers its
 * versioned plugins after this app's, so theirs runs first and this one runs
 * last over the same entitlements file.
 *
 * **Remove this when server push arrives** — `US-039` (EP-07) sends one — and
 * give the App ID the Push Notifications capability at the same time.
 */
module.exports = function withoutPushEntitlement(config) {
  return withEntitlementsPlist(config, (cfg) => {
    delete cfg.modResults['aps-environment']
    return cfg
  })
}
