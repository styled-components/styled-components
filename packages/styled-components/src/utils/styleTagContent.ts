import React from 'react';

/**
 * React before 19 HTML-escapes the text children of a server-rendered `<style>`
 * (`>` becomes `&gt;`), and browsers never decode entities inside `<style>`, so
 * selectors and quoted values would break. Those versions get the CSS as raw
 * HTML instead, with `</style` turned into the CSS escape `\3C/style` so a value
 * cannot close the tag. React 19 writes `<style>` text raw and guards the
 * closing tag itself.
 */
const REACT_ESCAPES_STYLE_TEXT = parseInt(React.version, 10) < 19;

type StyleTagContent = { children: string } | { dangerouslySetInnerHTML: { __html: string } };

/** Props that render `css` as the text of a server-emitted `<style>` element. */
export function styleTagContent(css: string): StyleTagContent {
  return REACT_ESCAPES_STYLE_TEXT
    ? { dangerouslySetInnerHTML: { __html: css.replace(/<\/style/gi, '\\3C/style') } }
    : { children: css };
}
