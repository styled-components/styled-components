// flow-typed signature: 3010d1e44b78eedb9cf85c4f9af67238
// flow-typed version: a9e75cb9a5/hoist-non-react-statics_v3.x.x/flow_>=v0.84.x <=v0.102.x

declare module 'hoist-non-react-statics' {
  /**
   * Inspired by DefinitelyTyped/types/hoist-non-react-statics/index.d.ts
   *
   * Unfortunately, unlike in TypeScript, current flow definitions for React does not allow us to tell whether
   * a React$ComponentType is “clean”, or had been the result of a call to React.memo or React.forwardRef.
   * Therefore we’ll only be able to precisely filter out statics that are common to all 3 cases, and will
   * have to live with maybes for everything else. This is not 100% precise, but is better than a blanket
   * $Shape call on the source component’s statics like what we were doing before in the v2.x.x defs.
   */

  // declare type REACT_STATICS = {
  //   childContextTypes: any,
  //   contextType: any,
  //   contextTypes: any,
  //   defaultProps: any,
  //   displayName: any,
  //   getDefaultProps: any,
  //   getDerivedStateFromError: any,
  //   getDerivedStateFromProps: any,
  //   mixins: any,
  //   propTypes: any,
  //   type: any,
  //   ...
  // };

  // declare type MEMO_STATICS = {
  //   $$typeof: any,
  //   compare: any,
  //   defaultProps: any,
  //   displayName: any,
  //   propTypes: any,
  //   type: any,
  //   ...
  // };

  // declare type FORWARD_REF_STATICS = {
  //   $$typeof: any,
  //   render: any,
  //   defaultProps: any,
  //   displayName: any,
  //   propTypes: any,
  //   ...
  // };

  declare type REACT_STATICS = {
    // “Maybe” React statics
    $$typeof?: any,
    childContextTypes?: any,
    compare?: any,
    contextType?: any,
    contextTypes?: any,
    getDefaultProps?: any,
    getDerivedStateFromError?: any,
    getDerivedStateFromProps?: any,
    mixins?: any,
    render?: any,
    type?: any,
    // Common React statics
    defaultProps: any,
    displayName: any,
    propTypes: any,
    ...
  };

  declare type $HoistedStatics<S, C> = $Call<
    & (empty => $Diff<S, REACT_STATICS>)
    & (any => $Diff<S, $ObjMap<C, any> & REACT_STATICS>),
    C
  >;

  /*
    TP - target component props
    T - target component statics
    S - source component statics
  */
  declare function hoistNonReactStatics<TP, T, S, C: { [key: string]: true, ... }>(
    TargetComponent: React$ComponentType<TP> & T,
    SourceComponent: React$ComponentType<any> & S,
    customStatics?: C
  ): React$ComponentType<TP> & $HoistedStatics<S, C> & T;

  declare export default typeof hoistNonReactStatics;
}
