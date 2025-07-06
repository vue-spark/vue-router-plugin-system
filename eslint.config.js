import { antfu } from '@antfu/eslint-config'

export default antfu(
  {
    ignores: ['.github'],
    type: 'lib',
    formatters: true,
    lessOpinionated: true,
  },
  {
    rules: {
      'antfu/top-level-function': ['error'],

      'style/operator-linebreak': [
        'error',
        'after',
        {
          overrides: {
            '?': 'before',
            ':': 'before',
            // 避免 `=` 后的 `/* @__PURE__ */` 被移动
            '=': 'ignore',
          },
        },
      ],
    },
  },
)
