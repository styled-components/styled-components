import * as React from "react";
import { StatelessComponent } from "react";

type ConstrainedProps<C, P> = C & ({ defaultProps?: P } | { new(props?: P, context?: any): any });
type StyledProps<P> = P & { theme: any };

interface StyledFunction<T, P> {
  (strs: TemplateStringsArray, ...fns: Array<(props: P) => string>): T;
}

interface StyledInterface {
  <C extends React.ComponentClass<P>, P, ThemeInterface>(component: ConstrainedProps<C, StyledProps<P>>): StyledFunction<C, P>;
  <C extends React.StatelessComponent<P>, P, ThemeInterface>(component: ConstrainedProps<C, P>): StyledFunction<C, P>;

  a: StyledFunction<React.HTMLFactory<HTMLAnchorElement>, StyledProps<React.HTMLAttributes<HTMLAnchorElement>>>;
  abbr: StyledFunction<React.HTMLFactory<HTMLElement>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  address: StyledFunction<React.HTMLFactory<HTMLElement>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  area: StyledFunction<React.HTMLFactory<HTMLAreaElement>, StyledProps<React.HTMLAttributes<HTMLAreaElement>>>;
  article: StyledFunction<React.HTMLFactory<HTMLElement>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  aside: StyledFunction<React.HTMLFactory<HTMLElement>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  audio: StyledFunction<React.HTMLFactory<HTMLAudioElement>, StyledProps<React.HTMLAttributes<HTMLAudioElement>>>;
  b: StyledFunction<React.HTMLFactory<HTMLElement>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  base: StyledFunction<React.HTMLFactory<HTMLBaseElement>, StyledProps<React.HTMLAttributes<HTMLBaseElement>>>;
  bdi: StyledFunction<React.HTMLFactory<HTMLElement>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  bdo: StyledFunction<React.HTMLFactory<HTMLElement>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  big: StyledFunction<React.HTMLFactory<HTMLElement>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  blockquote: StyledFunction<React.HTMLFactory<HTMLElement>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  body: StyledFunction<React.HTMLFactory<HTMLBodyElement>, StyledProps<React.HTMLAttributes<HTMLBodyElement>>>;
  br: StyledFunction<React.HTMLFactory<HTMLBRElement>, StyledProps<React.HTMLAttributes<HTMLBRElement>>>;
  button: StyledFunction<React.HTMLFactory<HTMLButtonElement>, StyledProps<React.HTMLAttributes<HTMLButtonElement>>>;
  canvas: StyledFunction<React.HTMLFactory<HTMLCanvasElement>, StyledProps<React.HTMLAttributes<HTMLCanvasElement>>>;
  caption: StyledFunction<React.HTMLFactory<HTMLElement>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  cite: StyledFunction<React.HTMLFactory<HTMLElement>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  code: StyledFunction<React.HTMLFactory<HTMLElement>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  col: StyledFunction<React.HTMLFactory<HTMLTableColElement>, StyledProps<React.HTMLAttributes<HTMLTableColElement>>>;
  colgroup: StyledFunction<React.HTMLFactory<HTMLTableColElement>, StyledProps<React.HTMLAttributes<HTMLTableColElement>>>;
  data: StyledFunction<React.HTMLFactory<HTMLElement>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  datalist: StyledFunction<React.HTMLFactory<HTMLDataListElement>, StyledProps<React.HTMLAttributes<HTMLDataListElement>>>;
  dd: StyledFunction<React.HTMLFactory<HTMLElement>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  del: StyledFunction<React.HTMLFactory<HTMLElement>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  details: StyledFunction<React.HTMLFactory<HTMLElement>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  dfn: StyledFunction<React.HTMLFactory<HTMLElement>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  dialog: StyledFunction<React.HTMLFactory<HTMLElement>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  div: StyledFunction<React.HTMLFactory<HTMLDivElement>, StyledProps<React.HTMLAttributes<HTMLDivElement>>>;
  dl: StyledFunction<React.HTMLFactory<HTMLDListElement>, StyledProps<React.HTMLAttributes<HTMLDListElement>>>;
  dt: StyledFunction<React.HTMLFactory<HTMLElement>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  em: StyledFunction<React.HTMLFactory<HTMLElement>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  embed: StyledFunction<React.HTMLFactory<HTMLEmbedElement>, StyledProps<React.HTMLAttributes<HTMLEmbedElement>>>;
  fieldset: StyledFunction<React.HTMLFactory<HTMLFieldSetElement>, StyledProps<React.HTMLAttributes<HTMLFieldSetElement>>>;
  figcaption: StyledFunction<React.HTMLFactory<HTMLElement>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  figure: StyledFunction<React.HTMLFactory<HTMLElement>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  footer: StyledFunction<React.HTMLFactory<HTMLElement>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  form: StyledFunction<React.HTMLFactory<HTMLFormElement>, StyledProps<React.HTMLAttributes<HTMLFormElement>>>;
  h1: StyledFunction<React.HTMLFactory<HTMLHeadingElement>, StyledProps<React.HTMLAttributes<HTMLHeadingElement>>>;
  h2: StyledFunction<React.HTMLFactory<HTMLHeadingElement>, StyledProps<React.HTMLAttributes<HTMLHeadingElement>>>;
  h3: StyledFunction<React.HTMLFactory<HTMLHeadingElement>, StyledProps<React.HTMLAttributes<HTMLHeadingElement>>>;
  h4: StyledFunction<React.HTMLFactory<HTMLHeadingElement>, StyledProps<React.HTMLAttributes<HTMLHeadingElement>>>;
  h5: StyledFunction<React.HTMLFactory<HTMLHeadingElement>, StyledProps<React.HTMLAttributes<HTMLHeadingElement>>>;
  h6: StyledFunction<React.HTMLFactory<HTMLHeadingElement>, StyledProps<React.HTMLAttributes<HTMLHeadingElement>>>;
  head: StyledFunction<React.HTMLFactory<HTMLHeadElement>, StyledProps<React.HTMLAttributes<HTMLHeadElement>>>;
  header: StyledFunction<React.HTMLFactory<HTMLElement>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  hgroup: StyledFunction<React.HTMLFactory<HTMLElement>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  hr: StyledFunction<React.HTMLFactory<HTMLHRElement>, StyledProps<React.HTMLAttributes<HTMLHRElement>>>;
  html: StyledFunction<React.HTMLFactory<HTMLHtmlElement>, StyledProps<React.HTMLAttributes<HTMLHtmlElement>>>;
  i: StyledFunction<React.HTMLFactory<HTMLElement>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  iframe: StyledFunction<React.HTMLFactory<HTMLIFrameElement>, StyledProps<React.HTMLAttributes<HTMLIFrameElement>>>;
  img: StyledFunction<React.HTMLFactory<HTMLImageElement>, StyledProps<React.HTMLAttributes<HTMLImageElement>>>;
  input: StyledFunction<React.HTMLFactory<HTMLInputElement>, StyledProps<React.HTMLAttributes<HTMLInputElement>>>;
  ins: StyledFunction<React.HTMLFactory<HTMLModElement>, StyledProps<React.HTMLAttributes<HTMLModElement>>>;
  kbd: StyledFunction<React.HTMLFactory<HTMLElement>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  keygen: StyledFunction<React.HTMLFactory<HTMLElement>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  label: StyledFunction<React.HTMLFactory<HTMLLabelElement>, StyledProps<React.HTMLAttributes<HTMLLabelElement>>>;
  legend: StyledFunction<React.HTMLFactory<HTMLLegendElement>, StyledProps<React.HTMLAttributes<HTMLLegendElement>>>;
  li: StyledFunction<React.HTMLFactory<HTMLLIElement>, StyledProps<React.HTMLAttributes<HTMLLIElement>>>;
  link: StyledFunction<React.HTMLFactory<HTMLLinkElement>, StyledProps<React.HTMLAttributes<HTMLLinkElement>>>;
  main: StyledFunction<React.HTMLFactory<HTMLElement>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  map: StyledFunction<React.HTMLFactory<HTMLMapElement>, StyledProps<React.HTMLAttributes<HTMLMapElement>>>;
  mark: StyledFunction<React.HTMLFactory<HTMLElement>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  menu: StyledFunction<React.HTMLFactory<HTMLElement>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  menuitem: StyledFunction<React.HTMLFactory<HTMLElement>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  meta: StyledFunction<React.HTMLFactory<HTMLMetaElement>, StyledProps<React.HTMLAttributes<HTMLMetaElement>>>;
  meter: StyledFunction<React.HTMLFactory<HTMLElement>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  nav: StyledFunction<React.HTMLFactory<HTMLElement>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  noscript: StyledFunction<React.HTMLFactory<HTMLElement>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  object: StyledFunction<React.HTMLFactory<HTMLObjectElement>, StyledProps<React.HTMLAttributes<HTMLObjectElement>>>;
  ol: StyledFunction<React.HTMLFactory<HTMLOListElement>, StyledProps<React.HTMLAttributes<HTMLOListElement>>>;
  optgroup: StyledFunction<React.HTMLFactory<HTMLOptGroupElement>, StyledProps<React.HTMLAttributes<HTMLOptGroupElement>>>;
  option: StyledFunction<React.HTMLFactory<HTMLOptionElement>, StyledProps<React.HTMLAttributes<HTMLOptionElement>>>;
  output: StyledFunction<React.HTMLFactory<HTMLElement>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  p: StyledFunction<React.HTMLFactory<HTMLParagraphElement>, StyledProps<React.HTMLAttributes<HTMLParagraphElement>>>;
  param: StyledFunction<React.HTMLFactory<HTMLParamElement>, StyledProps<React.HTMLAttributes<HTMLParamElement>>>;
  picture: StyledFunction<React.HTMLFactory<HTMLElement>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  pre: StyledFunction<React.HTMLFactory<HTMLPreElement>, StyledProps<React.HTMLAttributes<HTMLPreElement>>>;
  progress: StyledFunction<React.HTMLFactory<HTMLProgressElement>, StyledProps<React.HTMLAttributes<HTMLProgressElement>>>;
  q: StyledFunction<React.HTMLFactory<HTMLQuoteElement>, StyledProps<React.HTMLAttributes<HTMLQuoteElement>>>;
  rp: StyledFunction<React.HTMLFactory<HTMLElement>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  rt: StyledFunction<React.HTMLFactory<HTMLElement>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  ruby: StyledFunction<React.HTMLFactory<HTMLElement>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  s: StyledFunction<React.HTMLFactory<HTMLElement>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  samp: StyledFunction<React.HTMLFactory<HTMLElement>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  script: StyledFunction<React.HTMLFactory<HTMLElement>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  section: StyledFunction<React.HTMLFactory<HTMLElement>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  select: StyledFunction<React.HTMLFactory<HTMLSelectElement>, StyledProps<React.HTMLAttributes<HTMLSelectElement>>>;
  small: StyledFunction<React.HTMLFactory<HTMLElement>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  source: StyledFunction<React.HTMLFactory<HTMLSourceElement>, StyledProps<React.HTMLAttributes<HTMLSourceElement>>>;
  span: StyledFunction<React.HTMLFactory<HTMLSpanElement>, StyledProps<React.HTMLAttributes<HTMLSpanElement>>>;
  strong: StyledFunction<React.HTMLFactory<HTMLElement>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  style: StyledFunction<React.HTMLFactory<HTMLStyleElement>, StyledProps<React.HTMLAttributes<HTMLStyleElement>>>;
  sub: StyledFunction<React.HTMLFactory<HTMLElement>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  summary: StyledFunction<React.HTMLFactory<HTMLElement>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  sup: StyledFunction<React.HTMLFactory<HTMLElement>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  table: StyledFunction<React.HTMLFactory<HTMLTableElement>, StyledProps<React.HTMLAttributes<HTMLTableElement>>>;
  tbody: StyledFunction<React.HTMLFactory<HTMLTableSectionElement>, StyledProps<React.HTMLAttributes<HTMLTableSectionElement>>>;
  td: StyledFunction<React.HTMLFactory<HTMLTableDataCellElement>, StyledProps<React.HTMLAttributes<HTMLTableDataCellElement>>>;
  textarea: StyledFunction<React.HTMLFactory<HTMLTextAreaElement>, StyledProps<React.HTMLAttributes<HTMLTextAreaElement>>>;
  tfoot: StyledFunction<React.HTMLFactory<HTMLTableSectionElement>, StyledProps<React.HTMLAttributes<HTMLTableSectionElement>>>;
  th: StyledFunction<React.HTMLFactory<HTMLTableHeaderCellElement>, StyledProps<React.HTMLAttributes<HTMLTableHeaderCellElement>>>;
  thead: StyledFunction<React.HTMLFactory<HTMLTableSectionElement>, StyledProps<React.HTMLAttributes<HTMLTableSectionElement>>>;
  time: StyledFunction<React.HTMLFactory<HTMLElement>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  title: StyledFunction<React.HTMLFactory<HTMLTitleElement>, StyledProps<React.HTMLAttributes<HTMLTitleElement>>>;
  tr: StyledFunction<React.HTMLFactory<HTMLTableRowElement>, StyledProps<React.HTMLAttributes<HTMLTableRowElement>>>;
  track: StyledFunction<React.HTMLFactory<HTMLTrackElement>, StyledProps<React.HTMLAttributes<HTMLTrackElement>>>;
  u: StyledFunction<React.HTMLFactory<HTMLElement>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  ul: StyledFunction<React.HTMLFactory<HTMLUListElement>, StyledProps<React.HTMLAttributes<HTMLUListElement>>>;
  "var": StyledFunction<React.HTMLFactory<HTMLElement>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  video: StyledFunction<React.HTMLFactory<HTMLVideoElement>, StyledProps<React.HTMLAttributes<HTMLVideoElement>>>;
  wbr: StyledFunction<React.HTMLFactory<HTMLElement>, StyledProps<React.HTMLAttributes<HTMLElement>>>;

  // SVG
  circle: StyledFunction<React.SVGFactory, React.SVGAttributes<SVGCircleElement>>;
  clipPath: StyledFunction<React.SVGFactory, React.SVGAttributes<SVGClipPathElement>>;
  defs: StyledFunction<React.SVGFactory, React.SVGAttributes<SVGDefsElement>>;
  ellipse: StyledFunction<React.SVGFactory, React.SVGAttributes<SVGEllipseElement>>;
  g: StyledFunction<React.SVGFactory, React.SVGAttributes<SVGGElement>>;
  image: StyledFunction<React.SVGFactory, React.SVGAttributes<SVGImageElement>>;
  line: StyledFunction<React.SVGFactory, React.SVGAttributes<SVGLineElement>>;
  linearGradient: StyledFunction<React.SVGFactory, React.SVGAttributes<SVGLinearGradientElement>>;
  mask: StyledFunction<React.SVGFactory, React.SVGAttributes<SVGMaskElement>>;
  path: StyledFunction<React.SVGFactory, React.SVGAttributes<SVGPathElement>>;
  pattern: StyledFunction<React.SVGFactory, React.SVGAttributes<SVGPatternElement>>;
  polygon: StyledFunction<React.SVGFactory, React.SVGAttributes<SVGPolygonElement>>;
  polyline: StyledFunction<React.SVGFactory, React.SVGAttributes<SVGPolylineElement>>;
  radialGradient: StyledFunction<React.SVGFactory, React.SVGAttributes<SVGRadialGradientElement>>;
  rect: StyledFunction<React.SVGFactory, React.SVGAttributes<SVGRect>>;
  stop: StyledFunction<React.SVGFactory, React.SVGAttributes<SVGStopElement>>;
  svg: StyledFunction<React.SVGFactory, React.SVGAttributes<SVGSVGElement>>;
  text: StyledFunction<React.SVGFactory, React.SVGAttributes<SVGTextElement>>;
  tspan: StyledFunction<React.SVGFactory, React.SVGAttributes<SVGTSpanElement>>;
}

interface ThemeProps {
  theme: Object;
}

declare const styled: StyledInterface;

export const css: StyledFunction<(string | Function)[], any>;
export const keyframes: StyledFunction<string, any>;
export const injectGlobal: StyledFunction<undefined, any>;
export const ThemeProvider: StatelessComponent<ThemeProps>;

export default styled;
