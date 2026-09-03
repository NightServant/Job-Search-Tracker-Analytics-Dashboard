import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default [
  {
    ignores: ['dist/**', 'dist-ssr/**', 'node_modules/**'],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],

      // Avoid noisy failures for intentionally-unused args (common in callbacks)
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },

  {
    files: ['supabase/functions/**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        Deno: 'readonly',
      },
    },
  },

  {
    files: ['src/contexts/**/*.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },

  // App Router route files. Next REQUIRES `metadata` to be exported from the
  // same file as the page or layout -- there is no other place to put it -- so
  // react-refresh's "only export components" rule is describing a convention
  // this framework does not have.
  //
  // `allowExportNames` rather than turning the rule off: the rule still catches
  // a stray helper exported from a route file, which is the thing it is
  // actually good at. Only the names the framework itself defines are exempt.
  {
    files: ['src/app/**/*.tsx', 'src/app/**/*.ts'],
    rules: {
      'react-refresh/only-export-components': [
        'warn',
        {
          allowConstantExport: true,
          allowExportNames: [
            'metadata',
            'generateMetadata',
            'viewport',
            'generateViewport',
            'dynamic',
            'revalidate',
            'fetchCache',
            'runtime',
            'preferredRegion',
            'generateStaticParams',
          ],
        },
      ],
    },
  },

  // Vendored third-party source, copied in by the shadcn CLI and deliberately
  // left as shipped so a re-vendor is a clean diff. AnimateIcons casts its two
  // mouse handlers through `any`; shadcn components export variant objects
  // alongside their components. Both are the vendor's style, not this
  // project's, and editing 34 + 58 files to satisfy our rules would be undone
  // by the next `shadcn add`. Typechecking still applies in full: `tsc
  // --noEmit` covers every one of these files under `strict`.
  {
    files: ['src/components/icons/*.tsx'],
    ignores: ['src/components/icons/index.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
]
