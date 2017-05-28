// flow-typed signature: a46c83d9d0179a257b49b111f3fd3c95
// flow-typed version: 94e9f7e0a4/supports-color_v3.x.x/flow_>=v0.28.x

declare module 'supports-color' {
  declare module.exports: false |
    { level: 1, hasBasic: true, has256: false, has16m: false } |
    { level: 2, hasBasic: true, has256: true, has16m: false } |
    { level: 3, hasBasic: true, has256: true, has16m: true };
}
