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
  ],
}
export default antfu({
  ...nitro,
}, {
  rules: {
    'node/prefer-global/process': 'off',
  },
}, {
  files: ['playground/**/*.{ts,js,mjs,cjs}'],
  rules: {
    'no-console': 'off',
    'unused-imports/no-unused-vars': 'off',
  },
})
