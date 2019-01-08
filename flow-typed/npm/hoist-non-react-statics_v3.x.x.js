// flow-typed signature: f3245564b89d88c2a3d71d869eaf0a56
// flow-typed version: bd9770f761/hoist-non-react-statics_v2.x.x/flow_>=v0.54.1

declare module 'hoist-non-react-statics' {
  /*
    S - source component statics
    TP - target component props
    SP - additional source component props
  */
  declare module.exports: <TP, SP, S>(
    target: React$ComponentType<TP>,
    source: React$ComponentType<SP> & S,
    blacklist?: { [key: $Keys<S>]: boolean }
  ) => React$ComponentType<TP> & $Shape<S>;
}
