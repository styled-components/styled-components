// @flow
import minify from '../minify'

describe('minify', () => {
  it('minifies CSS', () => {
    const componentCSS = `
    .pages__Title-s19khds2-0 {}

    .bYhtfl {
      color:salmon;
      font-family:
      Helvetica;
      font-size:50px;
    }
    `
    const minifiedCSS = '.pages__Title-s19khds2-0{}.bYhtfl{color:salmon;font-family:Helvetica;font-size:50px;}'

    expect(minify(componentCSS)).toEqual(minifiedCSS)
  })

  it('keeps comments in the CSS', () => {
    const componentCSS = `
    /* sc-component-id: pages__Title-s19khds2-0 */

    .bYhtfl {
      color:salmon;
      font-family:
      Helvetica;
      font-size:50px;
    }
    `
    const minifiedCSS = '/* sc-component-id:pages__Title-s19khds2-0 */ .bYhtfl{color:salmon;font-family:Helvetica;font-size:50px;}'

    expect(minify(componentCSS)).toEqual(minifiedCSS)
  })
})
