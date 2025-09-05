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
  ],
}
export default antfu({
  ...nitro,
}, {
  rules: {
    'node/prefer-global/process': 'off',
    'no-new-func': 'off',
  },
}, {
  files: [
    'playgrounds/**/*.{ts,js,mjs,cjs}',
  ],
  rules: {
    'no-console': 'off',
    'unused-imports/no-unused-vars': 'off',
  },
})
