import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default [
  /**
   * What is not source.
   *
   * THE RULE IS "WHAT GIT REFUSES TO TRACK", not a list somebody curated. Every
   * entry below is already in .gitignore as generated or vendored, which is the
   * same question asked once rather than twice -- and a list maintained by
   * taste is the kind that goes stale silently.
   *
   * It went stale exactly that way. The list held `dist/` and `dist-ssr/`,
   * which are Vite's build directories, and this project has not used Vite
   * since the Next.js migration. Their Next equivalent was never added, so
   * `eslint .` walked the build output, the deploy artifacts and two Python
   * virtualenvs full of vendored JavaScript -- matplotlib's web backend,
   * playwright's bundled driver. `npm run lint` reported 50,298 problems
   * across 363 files, of which 37 files were ours. A check that noisy is not a
   * check: nobody reads it, and nothing fails.
   *
   * `scraper/.venv/**`, NOT `scraper/**`. The extractor is a Python project
   * and has no JavaScript of its own today, so the blanket version would work
   * -- right up until somebody adds a file and it is silently unlinted. Ignore
   * the virtualenv, which is the part that is genuinely not ours.
   *
   * `next-env.d.ts` is WRITTEN BY NEXT on every build, triple-slash reference
   * and all. Linting a file the framework regenerates means the rule can never
   * be satisfied.
   */
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      '.vercel/**',
      'next-env.d.ts',
      // Vite-era and vestigial -- nothing writes these any more. Kept because
      // .gitignore still lists them, and this list tracks that one rather
      // than second-guessing it.
      'dist/**',
      'dist-ssr/**',
      // Python virtualenvs: `venv/` is the repo-root scratch environment
      // (matplotlib, pandas) and `scraper/.venv/` is the extractor's own.
      'venv/**',
      'scraper/.venv/**',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    // `mjs` and `cjs` ARE IN THIS LIST DELIBERATELY. Without them the Node
    // scripts in scripts/ -- seed-demo.mjs and demoSeedData.mjs -- matched no
    // config that supplies globals, so every `process` and `console` in them
    // was reported as undefined: 20 errors describing nothing, in files where
    // those globals unambiguously exist. The rules still ran, which is how a
    // gap like this hides; it was the language environment that was missing.
    files: ['**/*.{ts,tsx,js,jsx,mjs,cjs}'],
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
