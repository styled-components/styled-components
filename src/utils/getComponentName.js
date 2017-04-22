// @flow

/* eslint-disable no-undef */
export default function getComponentName(target: ReactClass<*>): string {
  return (
    target.displayName ||
    target.name ||
    'Component'
  )
}
