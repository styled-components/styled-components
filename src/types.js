import type { Component } from 'react'

export type Interpolation = Function | Object | string
/* todo: I want this to actually be an array of Function | string but that causes errors */
export type RuleSet = Array<Interpolation>

export type Target = string | Class<Component>
