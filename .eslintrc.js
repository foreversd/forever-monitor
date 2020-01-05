const warning = process.env['CI'] ? 2 : 1;

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
    'no-unused-vars': [warning, { vars: 'all', args: 'none' }],
    'no-console': 0,
    'no-octal': 0,
    'no-var': 2,
    'no-empty': 0,
    'no-debugger': warning,
    'prefer-const': warning,
    'no-fallthrough': warning,
    'require-atomic-updates': 0,
  },
  env: {
    node: true,
    mocha: true,
    es6: true,
  },
};
