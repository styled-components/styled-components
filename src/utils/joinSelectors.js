// @flow

export default (outer: string, inner: string): string => outer.split(/\s*,\s*/)
  .map(outerPart => console.log(`"${outer}" — "${outerPart}"`) || (
      /&/.exec(inner) ? inner.replace(/&/g, outerPart) : `${outerPart} ${inner}`
    ).replace(/\s+$/, '')
  ).join(', ')
