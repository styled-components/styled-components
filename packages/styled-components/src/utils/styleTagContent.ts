import React from 'react';
import { IS_RSC } from '../constants';

/**
 * React before 19 HTML-escapes the text children of a server-rendered `<style>`
 * (`>` becomes `&gt;`), and browsers never decode entities inside `<style>`, so
 * selectors and quoted values would break. Those versions get the CSS as raw
 * HTML instead, escaping the `s`/`S` of `</style` (`</\73 tyle` / `</\53 tyle`,
 * matching React 19's own emitter) so a value cannot close the tag while keeping
 * letter case and any preceding backslash intact. React 19 writes `<style>` text
 * raw and guards the closing tag itself.
 *
 * Gated on `IS_RSC` so browser, standalone, and native builds fold this to
 * `false` at build time; `!(>= 19)` fails safe to raw HTML when `React.version`
 * is missing or non-numeric.
 */
const REACT_ESCAPES_STYLE_TEXT = IS_RSC && !(parseInt(React.version, 10) >= 19);

type StyleElementProps = {
  children?: string;
  dangerouslySetInnerHTML?: { __html: string };
  [key: string]: unknown;
};

const escapeStyleTagClose = (_match: string, s: string, rest: string) =>
  (s === 'S' ? '</\\53 ' : '</\\73 ') + rest;

/** Creates a server-emitted `<style>` element with `css` attached safely for the active React version. */
export function createStyleElement(props: StyleElementProps, css: string): React.ReactElement {
  if (REACT_ESCAPES_STYLE_TEXT) {
    props.dangerouslySetInnerHTML = {
      __html: css.replace(/<\/(s)(tyle)/gi, escapeStyleTagClose),
    };
  } else {
    props.children = css;
  }

  return React.createElement('style', props);
}
