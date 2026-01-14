import unjs from 'eslint-config-unjs'

export default unjs({
  ignores: ['**/.output', '**/*.gen.*', '**/dist'],
  rules: {
    'quotes': ['error', 'single'],
    'semi': ['error', 'always'],
    'comma-dangle': ['error', 'always-multiline'],
    'unicorn/filename-case': 'off',
    '@typescript-eslint/no-unsafe-function-type': 'off',
    '@typescript-eslint/no-namespace': 'off',
    'unicorn/no-null': 'off',
  },
})
