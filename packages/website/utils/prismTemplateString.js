import 'react-live'
import 'prismjs/components/prism-css'

// NOTE: This highlights template-strings as strings of CSS
Prism.languages.insertBefore('jsx', 'template-string', {
  'styled-template-string': {
    pattern: /(styled(\.\w+|\([^\)]*\))(\.\w+(\([^\)]*\))*)*|css|injectGlobal|keyframes|\.extend)`(?:\$\{[^}]+\}|\\\\|\\?[^\\])*?`/,
    lookbehind: true,
    greedy: true,
    inside: {
      interpolation: {
        pattern: /\$\{[^}]+\}/,
        inside: {
          'interpolation-punctuation': {
            pattern: /^\$\{|\}$/,
            alias: 'punctuation'
          },
          rest: Prism.languages.jsx
        }
      },
      string: {
        pattern: /[\s\S]+/,
        inside: Prism.languages.css,
        alias: 'language-css'
      }
    }
  }
})
