import * as React from "react";
import { StatelessComponent } from "react";

interface ThemeProps {
  theme: Object;
}

type ConstrainedProps<C, P> = C & ({ defaultProps?: P } | { new(props?: P, context?: any): any });
type StyledProps<P> = P & ThemeProps;
type Interpolation<P> = ((executionContext: StyledProps<P>) => string) | string | number

interface StyledFunction<T, P> {
  (strs: TemplateStringsArray, ...fns: Array<Interpolation<P>>): T;
}

interface StyledInterface {
  <C extends React.ComponentClass<P>, P, ThemeInterface>(component: ConstrainedProps<C, P>): StyledFunction<C, P>;
  <C extends React.StatelessComponent<P>, P, ThemeInterface>(component: ConstrainedProps<C, P>): StyledFunction<C, P>;

  a: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLAnchorElement>>, React.HTMLAttributes<HTMLAnchorElement>>;
  abbr: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, React.HTMLAttributes<HTMLElement>>;
  address: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, React.HTMLAttributes<HTMLElement>>;
  area: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLAreaElement>>, React.HTMLAttributes<HTMLAreaElement>>;
  article: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, React.HTMLAttributes<HTMLElement>>;
  aside: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, React.HTMLAttributes<HTMLElement>>;
  audio: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLAudioElement>>, React.HTMLAttributes<HTMLAudioElement>>;
  b: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, React.HTMLAttributes<HTMLElement>>;
  base: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLBaseElement>>, React.HTMLAttributes<HTMLBaseElement>>;
  bdi: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, React.HTMLAttributes<HTMLElement>>;
  bdo: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, React.HTMLAttributes<HTMLElement>>;
  big: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, React.HTMLAttributes<HTMLElement>>;
  blockquote: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, React.HTMLAttributes<HTMLElement>>;
  body: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLBodyElement>>, React.HTMLAttributes<HTMLBodyElement>>;
  br: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLBRElement>>, React.HTMLAttributes<HTMLBRElement>>;
  button: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLButtonElement>>, React.HTMLAttributes<HTMLButtonElement>>;
  canvas: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLCanvasElement>>, React.HTMLAttributes<HTMLCanvasElement>>;
  caption: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, React.HTMLAttributes<HTMLElement>>;
  cite: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, React.HTMLAttributes<HTMLElement>>;
  code: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, React.HTMLAttributes<HTMLElement>>;
  col: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLTableColElement>>, React.HTMLAttributes<HTMLTableColElement>>;
  colgroup: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLTableColElement>>, React.HTMLAttributes<HTMLTableColElement>>;
  data: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, React.HTMLAttributes<HTMLElement>>;
  datalist: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLDataListElement>>, React.HTMLAttributes<HTMLDataListElement>>;
  dd: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, React.HTMLAttributes<HTMLElement>>;
  del: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, React.HTMLAttributes<HTMLElement>>;
  details: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, React.HTMLAttributes<HTMLElement>>;
  dfn: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, React.HTMLAttributes<HTMLElement>>;
  dialog: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, React.HTMLAttributes<HTMLElement>>;
  div: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLDivElement>>, React.HTMLAttributes<HTMLDivElement>>;
  dl: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLDListElement>>, React.HTMLAttributes<HTMLDListElement>>;
  dt: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, React.HTMLAttributes<HTMLElement>>;
  em: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, React.HTMLAttributes<HTMLElement>>;
  embed: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLEmbedElement>>, React.HTMLAttributes<HTMLEmbedElement>>;
  fieldset: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLFieldSetElement>>, React.HTMLAttributes<HTMLFieldSetElement>>;
  figcaption: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, React.HTMLAttributes<HTMLElement>>;
  figure: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, React.HTMLAttributes<HTMLElement>>;
  footer: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, React.HTMLAttributes<HTMLElement>>;
  form: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLFormElement>>, React.HTMLAttributes<HTMLFormElement>>;
  h1: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLHeadingElement>>, React.HTMLAttributes<HTMLHeadingElement>>;
  h2: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLHeadingElement>>, React.HTMLAttributes<HTMLHeadingElement>>;
  h3: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLHeadingElement>>, React.HTMLAttributes<HTMLHeadingElement>>;
  h4: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLHeadingElement>>, React.HTMLAttributes<HTMLHeadingElement>>;
  h5: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLHeadingElement>>, React.HTMLAttributes<HTMLHeadingElement>>;
  h6: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLHeadingElement>>, React.HTMLAttributes<HTMLHeadingElement>>;
  head: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLHeadElement>>, React.HTMLAttributes<HTMLHeadElement>>;
  header: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, React.HTMLAttributes<HTMLElement>>;
  hgroup: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, React.HTMLAttributes<HTMLElement>>;
  hr: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLHRElement>>, React.HTMLAttributes<HTMLHRElement>>;
  html: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLHtmlElement>>, React.HTMLAttributes<HTMLHtmlElement>>;
  i: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, React.HTMLAttributes<HTMLElement>>;
  iframe: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLIFrameElement>>, React.HTMLAttributes<HTMLIFrameElement>>;
  img: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLImageElement>>, React.HTMLAttributes<HTMLImageElement>>;
  input: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLInputElement>>, React.HTMLAttributes<HTMLInputElement>>;
  ins: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLModElement>>, React.HTMLAttributes<HTMLModElement>>;
  kbd: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, React.HTMLAttributes<HTMLElement>>;
  keygen: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, React.HTMLAttributes<HTMLElement>>;
  label: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLLabelElement>>, React.HTMLAttributes<HTMLLabelElement>>;
  legend: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLLegendElement>>, React.HTMLAttributes<HTMLLegendElement>>;
  li: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLLIElement>>, React.HTMLAttributes<HTMLLIElement>>;
  link: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLLinkElement>>, React.HTMLAttributes<HTMLLinkElement>>;
  main: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, React.HTMLAttributes<HTMLElement>>;
  map: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLMapElement>>, React.HTMLAttributes<HTMLMapElement>>;
  mark: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, React.HTMLAttributes<HTMLElement>>;
  menu: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, React.HTMLAttributes<HTMLElement>>;
  menuitem: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, React.HTMLAttributes<HTMLElement>>;
  meta: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLMetaElement>>, React.HTMLAttributes<HTMLMetaElement>>;
  meter: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, React.HTMLAttributes<HTMLElement>>;
  nav: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, React.HTMLAttributes<HTMLElement>>;
  noscript: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, React.HTMLAttributes<HTMLElement>>;
  object: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLObjectElement>>, React.HTMLAttributes<HTMLObjectElement>>;
  ol: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLOListElement>>, React.HTMLAttributes<HTMLOListElement>>;
  optgroup: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLOptGroupElement>>, React.HTMLAttributes<HTMLOptGroupElement>>;
  option: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLOptionElement>>, React.HTMLAttributes<HTMLOptionElement>>;
  output: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, React.HTMLAttributes<HTMLElement>>;
  p: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLParagraphElement>>, React.HTMLAttributes<HTMLParagraphElement>>;
  param: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLParamElement>>, React.HTMLAttributes<HTMLParamElement>>;
  picture: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, React.HTMLAttributes<HTMLElement>>;
  pre: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLPreElement>>, React.HTMLAttributes<HTMLPreElement>>;
  progress: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLProgressElement>>, React.HTMLAttributes<HTMLProgressElement>>;
  q: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLQuoteElement>>, React.HTMLAttributes<HTMLQuoteElement>>;
  rp: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, React.HTMLAttributes<HTMLElement>>;
  rt: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, React.HTMLAttributes<HTMLElement>>;
  ruby: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, React.HTMLAttributes<HTMLElement>>;
  s: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, React.HTMLAttributes<HTMLElement>>;
  samp: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, React.HTMLAttributes<HTMLElement>>;
  script: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, React.HTMLAttributes<HTMLElement>>;
  section: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, React.HTMLAttributes<HTMLElement>>;
  select: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLSelectElement>>, React.HTMLAttributes<HTMLSelectElement>>;
  small: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, React.HTMLAttributes<HTMLElement>>;
  source: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLSourceElement>>, React.HTMLAttributes<HTMLSourceElement>>;
  span: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLSpanElement>>, React.HTMLAttributes<HTMLSpanElement>>;
  strong: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, React.HTMLAttributes<HTMLElement>>;
  style: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLStyleElement>>, React.HTMLAttributes<HTMLStyleElement>>;
  sub: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, React.HTMLAttributes<HTMLElement>>;
  summary: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, React.HTMLAttributes<HTMLElement>>;
  sup: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, React.HTMLAttributes<HTMLElement>>;
  table: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLTableElement>>, React.HTMLAttributes<HTMLTableElement>>;
  tbody: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLTableSectionElement>>, React.HTMLAttributes<HTMLTableSectionElement>>;
  td: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLTableDataCellElement>>, React.HTMLAttributes<HTMLTableDataCellElement>>;
  textarea: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLTextAreaElement>>, React.HTMLAttributes<HTMLTextAreaElement>>;
  tfoot: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLTableSectionElement>>, React.HTMLAttributes<HTMLTableSectionElement>>;
  th: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLTableHeaderCellElement>>, React.HTMLAttributes<HTMLTableHeaderCellElement>>;
  thead: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLTableSectionElement>>, React.HTMLAttributes<HTMLTableSectionElement>>;
  time: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, React.HTMLAttributes<HTMLElement>>;
  title: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLTitleElement>>, React.HTMLAttributes<HTMLTitleElement>>;
  tr: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLTableRowElement>>, React.HTMLAttributes<HTMLTableRowElement>>;
  track: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLTrackElement>>, React.HTMLAttributes<HTMLTrackElement>>;
  u: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, React.HTMLAttributes<HTMLElement>>;
  ul: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLUListElement>>, React.HTMLAttributes<HTMLUListElement>>;
  "var": StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, React.HTMLAttributes<HTMLElement>>;
  video: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLVideoElement>>, React.HTMLAttributes<HTMLVideoElement>>;
  wbr: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, React.HTMLAttributes<HTMLElement>>;

  // SVG
  circle: StyledFunction<React.ComponentClass<React.SVGProps>, React.SVGAttributes<SVGCircleElement>>;
  clipPath: StyledFunction<React.ComponentClass<React.SVGProps>, React.SVGAttributes<SVGClipPathElement>>;
  defs: StyledFunction<React.ComponentClass<React.SVGProps>, React.SVGAttributes<SVGDefsElement>>;
  ellipse: StyledFunction<React.ComponentClass<React.SVGProps>, React.SVGAttributes<SVGEllipseElement>>;
  g: StyledFunction<React.ComponentClass<React.SVGProps>, React.SVGAttributes<SVGGElement>>;
  image: StyledFunction<React.ComponentClass<React.SVGProps>, React.SVGAttributes<SVGImageElement>>;
  line: StyledFunction<React.ComponentClass<React.SVGProps>, React.SVGAttributes<SVGLineElement>>;
  linearGradient: StyledFunction<React.ComponentClass<React.SVGProps>, React.SVGAttributes<SVGLinearGradientElement>>;
  mask: StyledFunction<React.ComponentClass<React.SVGProps>, React.SVGAttributes<SVGMaskElement>>;
  path: StyledFunction<React.ComponentClass<React.SVGProps>, React.SVGAttributes<SVGPathElement>>;
  pattern: StyledFunction<React.ComponentClass<React.SVGProps>, React.SVGAttributes<SVGPatternElement>>;
  polygon: StyledFunction<React.ComponentClass<React.SVGProps>, React.SVGAttributes<SVGPolygonElement>>;
  polyline: StyledFunction<React.ComponentClass<React.SVGProps>, React.SVGAttributes<SVGPolylineElement>>;
  radialGradient: StyledFunction<React.ComponentClass<React.SVGProps>, React.SVGAttributes<SVGRadialGradientElement>>;
  rect: StyledFunction<React.ComponentClass<React.SVGProps>, React.SVGAttributes<SVGRect>>;
  stop: StyledFunction<React.ComponentClass<React.SVGProps>, React.SVGAttributes<SVGStopElement>>;
  svg: StyledFunction<React.ComponentClass<React.SVGProps>, React.SVGAttributes<SVGSVGElement>>;
  text: StyledFunction<React.ComponentClass<React.SVGProps>, React.SVGAttributes<SVGTextElement>>;
  tspan: StyledFunction<React.ComponentClass<React.SVGProps>, React.SVGAttributes<SVGTSpanElement>>;
}

declare const styled: StyledInterface;

export const css: StyledFunction<(string | Function)[], any>;
export const keyframes: StyledFunction<string, any>;
export const injectGlobal: StyledFunction<undefined, any>;
export const ThemeProvider: StatelessComponent<ThemeProps>;

export default styled;
