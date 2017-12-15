// @flow
const escapeRegex = /[[\].#*$><+~=|^:(),"'`-]+/g
const dashesAtEnds = /(^-|-$)/g

/**
 * TODO: Explore using CSS.escape when it becomes more available
 * in evergreen browsers.
 */
export default function escape(str: string): string {
  return (
    str
      // Replace all possible CSS selectors
      .replace(escapeRegex, '-')

      // Remove extraneous hyphens at the start and end
      .replace(dashesAtEnds, '')
  )
}
