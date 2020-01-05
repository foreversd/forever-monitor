module.exports = {
  parserOptions: {
    ecmaVersion: 2015,
  },
  extends: [
    'eslint:recommended',
    'prettier',
  ],
  plugins: [],
  rules: {
    'no-unused-vars': [2, { vars: 'all', args: 'none' }],
    'no-console': 0,
    'no-octal': 0,
    'no-var': 2,
    'no-empty': 0,
    'no-debugger': 2,
    'prefer-const': 2,
    'no-fallthrough': 2,
    'require-atomic-updates': 0,
    'no-useless-escape': 0
  },
  env: {
    node: true,
    mocha: true,
    es6: true,
  },
};
