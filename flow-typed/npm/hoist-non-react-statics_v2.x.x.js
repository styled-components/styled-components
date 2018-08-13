// flow-typed signature: 4a70afc6aaa9f6d8678add172ff49ba7
// flow-typed version: 341cb80802/hoist-non-react-statics_v2.x.x/flow_>=v0.54.1

declare module 'hoist-non-react-statics' {
  /*
    S - source component statics
    TP - target component props
    SP - additional source component props
  */
  declare module.exports: <TP, SP, S>(
    target: React$ComponentType<TP>,
    source: React$ComponentType<TP & SP> & S,
    blacklist?: { [key: $Keys<S>]: boolean }
  ) => React$ComponentType<TP> & $Shape<S>;
}
