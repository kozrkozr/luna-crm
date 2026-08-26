module.exports = function (api) {
  api.cache(true)
  return {
    /**
     * `jsxImportSource: 'nativewind'` is what gives every JSX element a
     * `className` prop; `nativewind/babel` compiles the Tailwind classes.
     * Both are required — with only the first, className is typed but inert.
     */
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
  }
}
