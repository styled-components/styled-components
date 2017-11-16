// @flow
const escapeRegex = /[[\].#*$><+~=|^:(),"'`-]+/g
const dashesAtEnds = /(^-|-$)/g

export default function escape(str: string): string {
  return str
        // Replace all possible CSS selectors
        .replace(escapeRegex, '-')

        // Remove extraneous hyphens at the start and end
        .replace(dashesAtEnds, '')
}
