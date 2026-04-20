import loguxOxlintConfig from '@logux/oxc-configs/lint'
import { defineConfig } from 'oxlint'

export default defineConfig({
  extends: [loguxOxlintConfig],
  ignorePatterns: ['data/**', 'dist/**'],
  rules: {
    'node/global-require': 'off'
  },
  overrides: [
    {
      files: ['src/**/*.js', '*.js'],
      rules: {
        'no-console': 'off'
      }
    }
  ]
})
