import React from 'react';
import { IS_BROWSER } from '../constants';
import StyleSheet from '../sheet';
import { SERVER_PLACEMENT } from '../sheet/Order';
import { warnOnce } from '../utils/warnOnce';
import { useStyleSheetContext } from './StyleSheetManager';
import { removeInstance, writeInstance } from './WebGlobalStyle';

/**
 * One level of a server styled instance's chain on the wire: component id, class name, compiled
 * rules, definition order in the server graph.
 */
export type ScStyleLevel = [id: string, name: string, rules: string[], seq: number];

/** Compiled keyframes on the wire: id, name, compiled rules. */
export type ScStyleKeyframes = [id: string, name: string, rules: string[]];

/** @internal */
export type ScStyleProps = {
  /** The instance's levels with rules, base first. */
  chain: ScStyleLevel[];
  keyframes: ScStyleKeyframes[];
  /** Ids of the components whose classes reached the instance's element before it: they wrap it. */
  outers: readonly string[];
};

/** @internal */
export type ScGlobalStyleProps = {
  id: string;
  keyframes: ScStyleKeyframes[];
  rules: string[];
  seq: number;
};

const NO_REGISTRY_MESSAGE =
  'Server component styles were not collected, so this page has no styles for them until it hydrates. Render the page inside a style registry (see the Next.js recipe at https://styled-components.com/docs/faqs), and check that only one copy of styled-components is installed.';

/** A render outside every registry (not a server sheet, and not in the browser) has nowhere to write. */
function warnWithoutRegistry(): void {
  if (__DEV__ && !IS_BROWSER) warnOnce('no-registry', NO_REGISTRY_MESSAGE);
}

/** Records each level's pin to the level before it, so the sheet orders them before any other edge touches them. */
function recordChain(chain: ScStyleLevel[]): void {
  for (let i = 0; i < chain.length; i++) {
    StyleSheet.registerId(chain[i][0], i === 0 ? undefined : chain[i - 1][0]);
  }
}

/** Writes the rules the sheet lacks, then learns which components wrap the chain's last level. */
function writeStyle(styleSheet: StyleSheet, props: ScStyleProps): void {
  const { chain, keyframes, outers } = props;
  for (let i = 0; i < keyframes.length; i++) {
    const [id, name, rules] = keyframes[i];
    if (!styleSheet.hasNameForId(id, name))
      styleSheet.insertRules(id, name, rules, SERVER_PLACEMENT);
  }

  for (let i = 0; i < chain.length; i++) {
    const [id, name, rules, seq] = chain[i];
    if (rules.length > 0 && !styleSheet.hasNameForId(id, name)) {
      styleSheet.insertRules(id, name, rules, { seq, server: true });
    }
  }

  if (chain.length === 0) return;

  const top = chain[chain.length - 1][0];
  for (let i = 0; i < outers.length; i++) styleSheet.learn(outers[i], top);
}

/**
 * Carries one server styled instance's rules into the sheet that renders it: the request sheet in
 * server-side rendering, the browser sheet when it mounts. See docs/react.md "Server component
 * styles".
 * @internal
 */
export function ScStyle(props: ScStyleProps): null {
  const { styleSheet } = useStyleSheetContext();

  recordChain(props.chain);

  if (styleSheet.server) writeStyle(styleSheet, props);
  else warnWithoutRegistry();

  if (!__SERVER__) {
    // biome-ignore lint/correctness/useHookAtTopLevel: __SERVER__ is a build-time constant, so a given bundle always runs this hook or never does
    React.useInsertionEffect(() => {
      if (!styleSheet.server) writeStyle(styleSheet, props);
    }, [props.chain, props.keyframes, props.outers, styleSheet]);
  }

  return null;
}

/**
 * Carries one server global style's rules into the sheet that renders it, and takes them out when
 * the browser unmounts it.
 * @internal
 */
export function ScGlobalStyle({ id, keyframes, rules, seq }: ScGlobalStyleProps): null {
  const { styleSheet } = useStyleSheetContext();
  const instance = React.useId();
  const entry = React.useMemo(
    () => ({
      keyframes: keyframes.map(([kfId, name, kfRules]) => ({ id: kfId, name, rules: kfRules })),
      name: id + instance,
      placement: { seq, server: true },
      rules,
    }),
    [id, instance, keyframes, rules, seq]
  );

  StyleSheet.registerId(id);

  if (styleSheet.server) writeInstance(styleSheet, id, instance, entry);
  else warnWithoutRegistry();

  if (!__SERVER__) {
    // biome-ignore-start lint/correctness/useHookAtTopLevel: __SERVER__ is a build-time constant, so a given bundle always runs both hooks or neither
    React.useInsertionEffect(() => {
      if (!styleSheet.server) writeInstance(styleSheet, id, instance, entry);
    }, [entry, id, instance, styleSheet]);

    // Cleanup only: fires on unmount or a sheet swap, never on a plain re-render.
    React.useInsertionEffect(() => {
      return () => {
        if (!styleSheet.server) removeInstance(styleSheet, id, instance);
      };
    }, [id, instance, styleSheet]);
    // biome-ignore-end lint/correctness/useHookAtTopLevel: end of the build-constant-gated region
  }

  return null;
}
