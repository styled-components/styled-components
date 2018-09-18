// @flow
/* These are helpers for the StyleTags to keep track of the injected
 * rule names for each (component) ID that they're keeping track of.
 * They're crucial for detecting whether a name has already been
 * injected.
 * (This excludes rehydrated names) */

export type Names = { [string]: { [string]: boolean } }

/* adds a new ID:name pairing to a names dictionary */
export const addNameForId = (names: Names, id: string, name: ?string) => {
  if (name) {
    // eslint-disable-next-line no-param-reassign
    const namesForId = names[id] || (names[id] = (Object.create(null): Object))
    namesForId[name] = true
  }
}

/* resets an ID entirely by overwriting it in the dictionary */
export const resetIdNames = (names: Names, id: string) => {
  // eslint-disable-next-line no-param-reassign
  names[id] = (Object.create(null): Object)
}

/* factory for a names dictionary checking the existance of an ID:name pairing */
export const hasNameForId = (names: Names) => (id: string, name: string) =>
  names[id] !== undefined && names[id][name]

/* stringifies names for the html/element output */
export const stringifyNames = (names: Names) => {
  let str = ''
  // eslint-disable-next-line guard-for-in
  for (const id in names) {
    str += `${Object.keys(names[id]).join(' ')} `
  }
  return str.trim()
}

/* clones the nested names dictionary */
export const cloneNames = (names: Names): Names => {
  const clone = (Object.create(null): Object)
  // eslint-disable-next-line guard-for-in
  for (const id in names) {
    clone[id] = { ...names[id] }
  }
  return clone
}
