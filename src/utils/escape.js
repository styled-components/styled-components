// @flow
const escapeRegex = /[[\].#*$><+~=|^:(),"'`]/g
const multiDashRegex = /--+/g
const dashAtEnd = /-$/

export default function escape(str: string): string {
  return str
        // Replace all possible CSS selectors
        .replace(escapeRegex, '-')

        // Replace multiple -- with single -
        .replace(multiDashRegex, '-')

        // Remove extraneous hyphens at the end
        .replace(dashAtEnd, '')
}
