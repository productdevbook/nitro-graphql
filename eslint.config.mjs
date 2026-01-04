import antfu from '@antfu/eslint-config'

const nitro = {
  ignores: [
    '**/core.ts',
    '**/.output',
    '**/.nitro',
    '**/.netlify',
    '**/.nuxt',
    '**/*.gen.*',
    '**/dist',
    '**/assets',
    '**/vfs',
    'README.md',
    'CONTRIBUTING.md',
    'CLAUDE.md',
    '.docs/**/*.md',
    '.docs/.vitepress/**/*',
    '**/*.graphql',
    '**/README.md',
    'examples/vite-vue/src/**/*.vue',
    'examples/vite-react/src/**/*.{tsx,jsx}',
    'content/**/*',
    // Test fixtures with intentional syntax errors
    'tests/fixtures/**/syntax-error.*',
  ],
}
export default antfu(
  {
    ...nitro,
  },
  {
    rules: {
      'node/prefer-global/process': 'off',
      'no-new-func': 'off',
    },
  },
  {
    files: [
      'playgrounds/**/*.{ts,js,mjs,cjs}',
    ],
    rules: {
      'no-console': 'off',
      'unused-imports/no-unused-vars': 'off',
    },
  },
  {
    files: ['examples/**', 'crates/**'],
    rules: {
      'unused-imports/no-unused-vars': 'off',
      'style/eol-last': 'off',
      'pnpm/json-enforce-catalog': 'off',
    },
  },
)
