import 'react-live'
import 'prismjs/components/prism-css'

// NOTE: This highlights template-strings as strings of CSS
Prism.languages.insertBefore('jsx', 'string', {
  'template-string': {
    pattern: /(styled(\.\w+|\([^\)]*\))(\.\w+(\([^\)]*\))*)*|css|injectGlobal|keyframes)`(?:\\\\|\\?[^\\])*?`/,
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
          rest: Prism.languages.javascript
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
