import extractCompsFromCSS from '../extractCompsFromCSS'

describe('extractCompsFromCSS', () => {
  it('should work for null or empty', () => {
    expect(extractCompsFromCSS('')).toEqual([])
    expect(extractCompsFromCSS(null)).toEqual([])
  })

  it('should ignore anything before the first SC', () => {
    expect(extractCompsFromCSS(`
      Totally ignored, who cares.
    `)).toEqual([])
  })

  it('should return a single SC', () => {
    expect(extractCompsFromCSS(`
/* sc-component-id: 123 */
.foo { color: red; }`
    )).toEqual([
      { componentId: '123', cssFromDOM: '.foo { color: red; }' },
    ])
  })

  it('should return a single SC with multiple lines', () => {
    expect(extractCompsFromCSS(`
/* sc-component-id: 123 */
.foo { color: red; }
.bar { color: blue; }`
    )).toEqual([
      { componentId: '123', cssFromDOM: '.foo { color: red; }\n.bar { color: blue; }' },
    ])
  })

  it('should return multiple SCs with multiple lines', () => {
    expect(extractCompsFromCSS(`
/* sc-component-id: 123 */
.foo { color: red; }
/* sc-component-id: 456 */
.bar { color: blue; }`
    )).toEqual([
      { componentId: '123', cssFromDOM: '.foo { color: red; }' },
      { componentId: '456', cssFromDOM: '.bar { color: blue; }' },
    ])
  })

  it('should return multiple SCs with multiple lines', () => {
    expect(extractCompsFromCSS(`
/* sc-component-id: 123 */
.foo { color: red; }
.bar { color: blue; }
/* sc-component-id: 456 */
.baz { color: green; }
.boo { color: black; }`
    )).toEqual([
      { componentId: '123', cssFromDOM: '.foo { color: red; }\n.bar { color: blue; }' },
      { componentId: '456', cssFromDOM: '.baz { color: green; }\n.boo { color: black; }' }
    ])
  })
})
