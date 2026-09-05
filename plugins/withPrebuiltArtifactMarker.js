const { withPodfile } = require('expo/config-plugins')

/**
 * A string that appears nowhere else in the Podfile, so the snippet is added
 * once however many times `prebuild` runs over the same file.
 */
const MARKER = '# [luna] prebuilt-artifact build-configuration marker'

/**
 * The two pods whose `.last_build_configuration` file `pod install` destroys.
 *
 * Hermes uses the same mechanism and has the same assumption, but is left out
 * deliberately. Its marker sits at the Pods root — `replace_hermes_version.js`
 * resolves the bare filename against its own working directory rather than the
 * pod's — so a plain `pod install`, the case that bit us, does not touch it.
 * A clean `prebuild` does, and Hermes then skips its swap; observed on
 * 2026-09-05, and the Debug build linked anyway. It has no debug-only symbols
 * for third-party pods to reference, which is the specific thing that breaks
 * the link here, and its tarball is far larger than the two below — so forcing
 * an extraction of it on every reinstall would cost real time to prevent a
 * failure that has not been seen. Expo's own precompiled modules keep their
 * markers under `<pod>/artifacts/` and survive for the same reason as Hermes.
 *
 * Add one here if it ever does fail to link. Not before.
 */
const PODS = ['React-Core-prebuilt', 'ReactNativeDependencies']

/**
 * The Ruby that runs at the end of every `pod install`.
 *
 * `Unknown` rather than the true flavour on disk. React Native decides whether
 * to swap an artifact by string-comparing this file against the configuration
 * being built, and any value that matches neither `Debug` nor `Release` makes
 * the next build — whichever it is — extract what it actually needs and then
 * overwrite this file with the real answer. Guessing the flavour instead is
 * what upstream does, and getting the guess wrong is the whole bug.
 *
 * The cost is one tarball extraction on the first build after a `pod install`,
 * a couple of seconds, and only when the marker was missing to begin with.
 */
const SNIPPET = `    ${MARKER}
    #
    # \`pod install\` re-creates these pods' directories, and that deletes the
    # \`.last_build_configuration\` file each one uses to record which flavour of
    # its prebuilt artifact is currently unpacked. React Native's swap scripts
    # read that file, and when it is missing they assume Debug —
    # \`shouldReplaceRnCoreConfiguration\` in
    # node_modules/react-native/scripts/replace-rncore-version.js:
    #
    #     // Assumption: if there is no stored last build, we assume that it was build for debug.
    #     if (!fileExists && configuration === 'Debug') { ... return false; }
    #
    # The assumption is wrong. \`pod install\` unpacks the RELEASE tarball
    # (rncore.rb: "RCT_USE_PREBUILT_RNCORE ... will use the release tarball"),
    # so a Debug build right after one skips the swap it needs and links against
    # a Release core. Every debug-only Fabric symbol the third-party pods
    # reference — \`Sealable::Sealable()\`, \`ShadowNode::getDebugName()\`, the
    # whole \`DebugStringConvertible\` family — is absent from it, and the app
    # fails to link with dozens of undefined symbols for arm64. Xcode reports a
    # SwiftUICore warning alongside it that has nothing to do with the cause.
    #
    # Reproduced 2026-09-05: a Release device build, then any \`pod install\`,
    # then \`npm run ios\`.
    ${JSON.stringify(PODS)}.each do |pod_name|
      pod_dir = File.join(installer.sandbox.root.to_s, pod_name)
      marker = File.join(pod_dir, '.last_build_configuration')
      next unless File.directory?(pod_dir)
      # Only when it is missing. A marker that exists was written by the build
      # that last swapped an artifact in, so it is accurate — overwriting it
      # would force an extraction that changes nothing.
      next if File.exist?(marker)
      Pod::UI.puts "[luna] seeding #{pod_name}/.last_build_configuration"
      File.write(marker, 'Unknown')
    end
`

/**
 * Keep a Debug build from linking against the Release React Native core.
 *
 * The failure this prevents is upstream (React Native 0.86.2) and is invisible
 * until the link step, where it surfaces as undefined C++ symbols in libraries
 * nobody touched — RNSVG, Reanimated, DateTimePicker — which is a long way from
 * the `pod install` that actually caused it. See `SNIPPET` for the mechanism.
 *
 * A config plugin, and it has to be one: the marker is deleted BY `pod install`,
 * so nothing that runs before `npm run ios` can put it back. A Podfile
 * `post_install` hook is the only point that runs late enough, and `ios/` is
 * gitignored here — hand-editing the Podfile would survive exactly until the
 * next `expo prebuild`.
 *
 * Delete this when upstream stops assuming. The snippet is a no-op against a
 * fixed React Native: it only ever writes a file that is already missing, and a
 * version that writes its own marker at install time would leave nothing to do.
 */
module.exports = function withPrebuiltArtifactMarker(config) {
  return withPodfile(config, (podfileConfig) => {
    const contents = podfileConfig.modResults.contents

    if (contents.includes(MARKER)) return podfileConfig

    const anchor = 'post_install do |installer|'
    if (!contents.includes(anchor)) {
      // Loud rather than silent. A Podfile template without a `post_install`
      // block means this plugin is aimed at something that no longer looks the
      // way it did, and a plugin that quietly does nothing is worse than the
      // bug it was written for.
      throw new Error(
        `withPrebuiltArtifactMarker: no ${JSON.stringify(anchor)} in the Podfile — ` +
          'the template changed, so the hook has nowhere to go.'
      )
    }

    podfileConfig.modResults.contents = contents.replace(anchor, `${anchor}\n${SNIPPET}`)
    return podfileConfig
  })
}
