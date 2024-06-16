import loguxConfig from '@logux/eslint-config'

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  { ignores: ['data/', 'dist/'] },
  ...loguxConfig,
  {
    rules: {
      'camelcase': 'off',
      'n/global-require': 'off',
      'perfectionist/sort-objects': 'off'
    }
  },
  {
    files: ['dist/**/*.js'],
    rules: {
      'node-import/prefer-node-protocol': 'off',
      'prefer-exponentiation-operator': 'off'
    }
  },
  {
    files: ['src/**/*.js', '*.js'],
    rules: {
      'n/no-unsupported-features/node-builtins': 'off',
      'no-console': 'off'
    }
  }
]
