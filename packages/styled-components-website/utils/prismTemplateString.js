import 'react-live'
import 'prismjs/components/prism-css'
import { languages } from 'prismjs/components/prism-core'

// NOTE: This highlights template-strings as strings of CSS
languages.insertBefore('jsx', 'string', {
  'template-string': {
    pattern: /(styled(\.\w+|\([^\)]*\))(\.\w+(\([^\)]*\))*)*|css|injectGlobal|keyframes|\.extend)`(?:\\\\|\\?[^\\])*?`/,
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
          rest: languages.jsx
        }
      },
      string: {
        pattern: /[\s\S]+/,
        inside: languages.css,
        alias: 'language-css'
      }
    }
  }
})
