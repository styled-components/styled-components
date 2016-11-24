// @flow
export type Interpolation = ((executionContext: Object) => string) | string | number
/* todo: I want this to actually be an array of Function | string but that causes errors */
export type RuleSet = Array<Interpolation>

/* eslint-disable no-undef */
type Tag = string | ReactClass<*>
type Input = { tag: Tag, identifier?: string, displayName?: string }

export type Target = Tag | Input

export type NameGenerator = (hash: number) => string
