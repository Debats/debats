// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from 'eslint-plugin-storybook'

import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import prettier from 'eslint-config-prettier/flat'

const eslintConfig = defineConfig([
  ...nextVitals,
  prettier,
  {
    // TODO: fix these react-hooks issues then remove these overrides
    rules: {
      'react-hooks/error-boundaries': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
    },
  },
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'frontend/**',
    'api/**',
    'ruby-backend/**',
    'debats-elixir/**',
    'content/**',
    'docs/**',
    'scripts/**',
  ]),
  ...storybook.configs['flat/recommended'],
])

export default eslintConfig
