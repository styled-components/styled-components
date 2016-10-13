import type { Component } from 'react'

export type Interpolation = Function | Object | string
/* todo: I want this to actually be an array of Function | string but that causes errors */
export type RuleSet = Array<Interpolation>

/* eslint-disable no-undef */
export type Target = string | Class<Component>

export type NameGenerator = (hash: number) => string
