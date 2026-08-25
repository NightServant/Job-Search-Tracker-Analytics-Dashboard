export default {
  plugins: {
    // v4 does its own nesting and prefixing, so autoprefixer and postcss-import
    // are not just unnecessary here -- running them again double-processes.
    '@tailwindcss/postcss': {},
  },
}
