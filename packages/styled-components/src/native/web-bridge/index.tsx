/**
 * Experimental rn-web bridge. Routes `styled-components/native` consumers
 * running under react-native-web through the web pipeline (CSSOM
 * insertRule, atomic-ish className output) instead of building an RN
 * style object that react-native-web then re-tokenizes back into atomic
 * CSS.
 *
 * Two pipelines doing the same work was the win to delete; the small
 * trick that makes it possible is styleq's `$$css` escape hatch. We
 * wrap each rn-web primitive in a shim that converts the className
 * the web `styled` factory hands it into a `{ $$css: true, sc: cls }`
 * style entry; rn-web composes that into its DOM className alongside
 * its own atomic classes.
 *
 * @see ../../test/rn-web-contract.test.tsx — locks the $$css contract
 */

import * as React from 'react';
import { Pressable, Text, View } from 'react-native-web';

import styledWeb from '../../constructors/styled';
import createTheme from '../../constructors/createTheme';
import ThemeProvider, { ThemeConsumer, ThemeContext, useTheme } from '../../models/ThemeProvider';
import css from '../../constructors/css';
import keyframes from '../../constructors/keyframes';
import createGlobalStyle from '../../constructors/createGlobalStyle';
import withTheme from '../../hoc/withTheme';
import isStyledComponent from '../../utils/isStyledComponent';
import StyleSheetManager from '../../models/StyleSheetManager';
import ServerStyleSheet from '../../models/ServerStyleSheet';
import type { Styled } from '../../constructors/constructWithOptions';

type BridgedProps = {
  className?: string;
  style?: unknown;
  [key: string]: unknown;
};

/**
 * Wrap a rn-web primitive so the web pipeline's `className` prop becomes a
 * styleq `$$css` entry in `style`. rn-web's createDOMProps reads `style`
 * exclusively for className generation, so we must deliver our class
 * through `style` to land on the DOM.
 */
function bridgePrimitive<P extends BridgedProps>(
  Component: React.ComponentType<P>,
  displayName: string
): React.ForwardRefExoticComponent<React.PropsWithoutRef<P> & React.RefAttributes<unknown>> {
  const Bridged = React.forwardRef<unknown, P>((props, ref) => {
    const { className, style, ...rest } = props;
    const merged = className ? [{ $$css: true, sc: className }, style] : style;
    return React.createElement(Component, {
      ...(rest as object),
      ref,
      style: merged,
    } as unknown as P);
  });
  Bridged.displayName = displayName;
  return Bridged;
}

const BridgedView = bridgePrimitive(View as React.ComponentType<BridgedProps>, 'BridgedView');
const BridgedText = bridgePrimitive(Text as React.ComponentType<BridgedProps>, 'BridgedText');
const BridgedPressable = bridgePrimitive(
  Pressable as React.ComponentType<BridgedProps>,
  'BridgedPressable'
);

type StyledFactory = typeof styledWeb;

/**
 * `styled` bound to rn-web primitives. `styled.View\`...\`` produces a
 * styled component that renders rn-web's `<View>` while injecting CSS
 * through the web pipeline.
 */
const styled = styledWeb as StyledFactory & {
  View: Styled<'web', typeof BridgedView, React.ComponentPropsWithRef<typeof View>>;
  Text: Styled<'web', typeof BridgedText, React.ComponentPropsWithRef<typeof Text>>;
  Pressable: Styled<'web', typeof BridgedPressable, React.ComponentPropsWithRef<typeof Pressable>>;
};

(styled as Record<string, unknown>).View = styledWeb(BridgedView);
(styled as Record<string, unknown>).Text = styledWeb(BridgedText);
(styled as Record<string, unknown>).Pressable = styledWeb(BridgedPressable);

export default styled;
export {
  styled,
  createTheme,
  css,
  keyframes,
  createGlobalStyle,
  withTheme,
  isStyledComponent,
  ThemeProvider,
  ThemeConsumer,
  ThemeContext,
  useTheme,
  StyleSheetManager,
  ServerStyleSheet,
};
