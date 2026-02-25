module.exports = {
  root: true,
  env: { 
    browser: true, 
    es2020: true 
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    // Vite-specific: ensures Fast Refresh works correctly
    'react-refresh/only-export-components': [
      'warn', 
      { allowConstantExport: true }
    ],
    // Clean code: allows unused variables only if they start with an underscore
    '@typescript-eslint/no-unused-vars': [
      'error', 
      { argsIgnorePattern: '^_' }
    ],
    // P0 Quality: Strictly forbid the 'any' type to maintain type integrity
    '@typescript-eslint/no-explicit-any': 'error',
    // Logging: Warn for console.log, but allow operational warnings/errors
    'no-console': [
      'warn', 
      { allow: ['warn', 'error'] }
    ],
    // Best practice: Force immutable variable declarations where possible
    'prefer-const': 'error',
  },
}