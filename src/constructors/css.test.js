import expect from 'expect'
import css from './css'
import concat from './concat'
import rule from './rule'
import nested from './nested'

describe('css', () => {
  describe('simple inputs', () => {
    it('should be ok with nonce inputs', () => {
      expect(css``.rules).toEqual([])
      expect(css`this aint css`.rules).toEqual([])
      expect(css`🔥🔥😎`.rules).toEqual([])
    })

    it('should handle a single simple rule', () => {
      const expected = concat(
        rule('background', 'red')
      );
      expect(css`background:red;`).toEqual(expected)
      expect(css`background: red;`).toEqual(expected);
    })

    it('should handle dashed rules', () => {
      const expected = concat(
        rule('flexGrow', '1')
      );
      expect(css`flex-grow: 1;`).toEqual(expected)
      expect(css`flexGrow: 1;`).toEqual(expected);
    })

    it('should handle multiple lines', () => {
      const expected = concat(
        rule('flexGrow', '1'),
        rule('flexShrink', '0')
      );
      expect(css`flex-grow: 1;\nflex-shrink: 0;`).toEqual(expected)
    })

    it('should pass through duplicates', () => {
      const expected = concat(
        rule('flexGrow', '1'),
        rule('flexShrink', '0'),
        rule('flexGrow', '0')
      );
      expect(css`flex-grow: 1;\nflex-shrink: 0;\nflex-grow: 0;`).toEqual(expected)
    })
  })

  describe('nesting', () => {
    it('should handle nested tag selectors', () => {
      expect(css`
        background: red;
        img {
          background: white;
        }
      `).toEqual(concat(
        rule('background', 'red'),
        nested('img',
          rule('background', 'white')
        )
      ))
    })

    it('should handle more complex nested tag selectors', () => {
      expect(css`
        margin: 0 auto;
        > img + img, .push-left {
          margin-left: 1rem;
        }
      `).toEqual(concat(
        rule('margin', '0 auto'),
        nested('> img + img, .push-left',
          rule('marginLeft', '1rem')
        )
      ))
    })

    it('should pass through pseduo selectors', () => {
      expect(css`
        text-decoration: none;
        &:hover {
          text-decoration: underline;
        }
      `).toEqual(concat(
        rule('textDecoration', 'none'),
        nested('&:hover',
          rule('textDecoration', 'underline')
        )
      ))
    })

    it('should pass through multiple selectors', () => {
      expect(css`
        text-decoration: none;
        &:hover, &:active, :root.ios & {
          text-decoration: underline;
        }
      `).toEqual(concat(
        rule('textDecoration', 'none'),
        nested('&:hover, &:active, :root.ios &',
          rule('textDecoration', 'underline')
        )
      ))
    })

    it('should properly handle multiple nesting', () => {
      expect(css`
        position: relative;
        img {
          position: absolute;
          &.-in-flow {
            position: static;
          }
        }
        > span {
          font-weight: bold;
          html.ios & {
            font-weight: normal;
          }
        }
      `).toEqual(concat(
        rule('position', 'relative'),
        nested('img',
          rule('position', 'absolute'),
          nested('&.-in-flow',
            rule('position', 'static')
          )
        ),
        nested('> span',
          rule('fontWeight', 'bold'),
          nested('html.ios &',
            rule('fontWeight', 'normal')
          )
        )
      ))
    })
  })
})
