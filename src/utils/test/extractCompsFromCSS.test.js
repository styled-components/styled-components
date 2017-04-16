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
    const css = `
      /* sc-component-id: 123 */
      .foo { color: red; }
    `
    expect(extractCompsFromCSS(css)).toEqual([
      { componentId: '123', cssFromDOM: css.replace(/^\n/,'') },
    ])
  })

  it('should return a single SC with multiple lines', () => {
    const css = `
      /* sc-component-id: 123 */
      .foo { color: red; }
      .bar { color: blue; }
    `
    expect(extractCompsFromCSS(css)).toEqual([
      { componentId: '123', cssFromDOM: css.replace(/^\n/,'') },
    ])
  })

  it('should return multiple SCs with single lines', () => {
    const a = `
      /* sc-component-id: 123 */
      .foo { color: red; }
    `
    const b = `
      /* sc-component-id: 456 */
      .bar { color: blue; }
    `
    expect(extractCompsFromCSS(a + b)).toEqual([
      { componentId: '123', cssFromDOM: a.replace(/^\n/,'') + '\n' },
      { componentId: '456', cssFromDOM: b.replace(/^\n/,'') },
    ])
  })

  it('should return multiple SCs with multiple lines', () => {
    const a = `
      /* sc-component-id: 123 */
      .foo { color: red; }
      .bar { color: blue; }
    `
    const b = `
      /* sc-component-id: 456 */
      .baz { color: green; }
      .boo { color: black; }
    `
    expect(extractCompsFromCSS(a + b)).toEqual([
      { componentId: '123', cssFromDOM: a.replace(/^\n/,'') + '\n' },
      { componentId: '456', cssFromDOM: b.replace(/^\n/,'') },
    ])
  })

  it('should include whitespace after a component', () => {
    const a = `
      /* sc-component-id: 123 */
      .foo { color: red; }
      .bar { color: blue; }
      
      
      
    `
    const b = `
      /* sc-component-id: 456 */
      .baz { color: green; }
      .boo { color: black; }
      
      
      
    `
    expect(extractCompsFromCSS(a + b)).toEqual([
      { componentId: '123', cssFromDOM: a.replace(/^\n/,'') + '\n' },
      { componentId: '456', cssFromDOM: b.replace(/^\n/,'') },
    ])
  })
})
