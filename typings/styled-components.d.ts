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

  a: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLAnchorElement>>, StyledProps<React.HTMLAttributes<HTMLAnchorElement>>>;
  abbr: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  address: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  area: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLAreaElement>>, StyledProps<React.HTMLAttributes<HTMLAreaElement>>>;
  article: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  aside: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  audio: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLAudioElement>>, StyledProps<React.HTMLAttributes<HTMLAudioElement>>>;
  b: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  base: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLBaseElement>>, StyledProps<React.HTMLAttributes<HTMLBaseElement>>>;
  bdi: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  bdo: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  big: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  blockquote: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  body: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLBodyElement>>, StyledProps<React.HTMLAttributes<HTMLBodyElement>>>;
  br: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLBRElement>>, StyledProps<React.HTMLAttributes<HTMLBRElement>>>;
  button: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLButtonElement>>, StyledProps<React.HTMLAttributes<HTMLButtonElement>>>;
  canvas: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLCanvasElement>>, StyledProps<React.HTMLAttributes<HTMLCanvasElement>>>;
  caption: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  cite: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  code: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  col: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLTableColElement>>, StyledProps<React.HTMLAttributes<HTMLTableColElement>>>;
  colgroup: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLTableColElement>>, StyledProps<React.HTMLAttributes<HTMLTableColElement>>>;
  data: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  datalist: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLDataListElement>>, StyledProps<React.HTMLAttributes<HTMLDataListElement>>>;
  dd: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  del: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  details: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  dfn: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  dialog: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  div: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLDivElement>>, StyledProps<React.HTMLAttributes<HTMLDivElement>>>;
  dl: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLDListElement>>, StyledProps<React.HTMLAttributes<HTMLDListElement>>>;
  dt: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  em: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  embed: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLEmbedElement>>, StyledProps<React.HTMLAttributes<HTMLEmbedElement>>>;
  fieldset: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLFieldSetElement>>, StyledProps<React.HTMLAttributes<HTMLFieldSetElement>>>;
  figcaption: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  figure: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  footer: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  form: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLFormElement>>, StyledProps<React.HTMLAttributes<HTMLFormElement>>>;
  h1: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLHeadingElement>>, StyledProps<React.HTMLAttributes<HTMLHeadingElement>>>;
  h2: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLHeadingElement>>, StyledProps<React.HTMLAttributes<HTMLHeadingElement>>>;
  h3: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLHeadingElement>>, StyledProps<React.HTMLAttributes<HTMLHeadingElement>>>;
  h4: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLHeadingElement>>, StyledProps<React.HTMLAttributes<HTMLHeadingElement>>>;
  h5: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLHeadingElement>>, StyledProps<React.HTMLAttributes<HTMLHeadingElement>>>;
  h6: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLHeadingElement>>, StyledProps<React.HTMLAttributes<HTMLHeadingElement>>>;
  head: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLHeadElement>>, StyledProps<React.HTMLAttributes<HTMLHeadElement>>>;
  header: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  hgroup: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  hr: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLHRElement>>, StyledProps<React.HTMLAttributes<HTMLHRElement>>>;
  html: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLHtmlElement>>, StyledProps<React.HTMLAttributes<HTMLHtmlElement>>>;
  i: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  iframe: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLIFrameElement>>, StyledProps<React.HTMLAttributes<HTMLIFrameElement>>>;
  img: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLImageElement>>, StyledProps<React.HTMLAttributes<HTMLImageElement>>>;
  input: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLInputElement>>, StyledProps<React.HTMLAttributes<HTMLInputElement>>>;
  ins: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLModElement>>, StyledProps<React.HTMLAttributes<HTMLModElement>>>;
  kbd: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  keygen: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  label: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLLabelElement>>, StyledProps<React.HTMLAttributes<HTMLLabelElement>>>;
  legend: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLLegendElement>>, StyledProps<React.HTMLAttributes<HTMLLegendElement>>>;
  li: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLLIElement>>, StyledProps<React.HTMLAttributes<HTMLLIElement>>>;
  link: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLLinkElement>>, StyledProps<React.HTMLAttributes<HTMLLinkElement>>>;
  main: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  map: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLMapElement>>, StyledProps<React.HTMLAttributes<HTMLMapElement>>>;
  mark: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  menu: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  menuitem: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  meta: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLMetaElement>>, StyledProps<React.HTMLAttributes<HTMLMetaElement>>>;
  meter: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  nav: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  noscript: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  object: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLObjectElement>>, StyledProps<React.HTMLAttributes<HTMLObjectElement>>>;
  ol: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLOListElement>>, StyledProps<React.HTMLAttributes<HTMLOListElement>>>;
  optgroup: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLOptGroupElement>>, StyledProps<React.HTMLAttributes<HTMLOptGroupElement>>>;
  option: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLOptionElement>>, StyledProps<React.HTMLAttributes<HTMLOptionElement>>>;
  output: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  p: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLParagraphElement>>, StyledProps<React.HTMLAttributes<HTMLParagraphElement>>>;
  param: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLParamElement>>, StyledProps<React.HTMLAttributes<HTMLParamElement>>>;
  picture: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  pre: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLPreElement>>, StyledProps<React.HTMLAttributes<HTMLPreElement>>>;
  progress: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLProgressElement>>, StyledProps<React.HTMLAttributes<HTMLProgressElement>>>;
  q: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLQuoteElement>>, StyledProps<React.HTMLAttributes<HTMLQuoteElement>>>;
  rp: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  rt: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  ruby: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  s: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  samp: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  script: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  section: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  select: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLSelectElement>>, StyledProps<React.HTMLAttributes<HTMLSelectElement>>>;
  small: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  source: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLSourceElement>>, StyledProps<React.HTMLAttributes<HTMLSourceElement>>>;
  span: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLSpanElement>>, StyledProps<React.HTMLAttributes<HTMLSpanElement>>>;
  strong: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  style: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLStyleElement>>, StyledProps<React.HTMLAttributes<HTMLStyleElement>>>;
  sub: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  summary: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  sup: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  table: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLTableElement>>, StyledProps<React.HTMLAttributes<HTMLTableElement>>>;
  tbody: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLTableSectionElement>>, StyledProps<React.HTMLAttributes<HTMLTableSectionElement>>>;
  td: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLTableDataCellElement>>, StyledProps<React.HTMLAttributes<HTMLTableDataCellElement>>>;
  textarea: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLTextAreaElement>>, StyledProps<React.HTMLAttributes<HTMLTextAreaElement>>>;
  tfoot: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLTableSectionElement>>, StyledProps<React.HTMLAttributes<HTMLTableSectionElement>>>;
  th: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLTableHeaderCellElement>>, StyledProps<React.HTMLAttributes<HTMLTableHeaderCellElement>>>;
  thead: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLTableSectionElement>>, StyledProps<React.HTMLAttributes<HTMLTableSectionElement>>>;
  time: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  title: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLTitleElement>>, StyledProps<React.HTMLAttributes<HTMLTitleElement>>>;
  tr: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLTableRowElement>>, StyledProps<React.HTMLAttributes<HTMLTableRowElement>>>;
  track: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLTrackElement>>, StyledProps<React.HTMLAttributes<HTMLTrackElement>>>;
  u: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  ul: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLUListElement>>, StyledProps<React.HTMLAttributes<HTMLUListElement>>>;
  "var": StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, StyledProps<React.HTMLAttributes<HTMLElement>>>;
  video: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLVideoElement>>, StyledProps<React.HTMLAttributes<HTMLVideoElement>>>;
  wbr: StyledFunction<React.ComponentClass<React.HTMLProps<HTMLElement>>, StyledProps<React.HTMLAttributes<HTMLElement>>>;

  // SVG
  circle: StyledFunction<React.ComponentClass<StyledProps<React.SVGProps>>, React.SVGAttributes<SVGCircleElement>>;
  clipPath: StyledFunction<React.ComponentClass<StyledProps<React.SVGProps>>, React.SVGAttributes<SVGClipPathElement>>;
  defs: StyledFunction<React.ComponentClass<StyledProps<React.SVGProps>>, React.SVGAttributes<SVGDefsElement>>;
  ellipse: StyledFunction<React.ComponentClass<StyledProps<React.SVGProps>>, React.SVGAttributes<SVGEllipseElement>>;
  g: StyledFunction<React.ComponentClass<StyledProps<React.SVGProps>>, React.SVGAttributes<SVGGElement>>;
  image: StyledFunction<React.ComponentClass<StyledProps<React.SVGProps>>, React.SVGAttributes<SVGImageElement>>;
  line: StyledFunction<React.ComponentClass<StyledProps<React.SVGProps>>, React.SVGAttributes<SVGLineElement>>;
  linearGradient: StyledFunction<React.ComponentClass<StyledProps<React.SVGProps>>, React.SVGAttributes<SVGLinearGradientElement>>;
  mask: StyledFunction<React.ComponentClass<StyledProps<React.SVGProps>>, React.SVGAttributes<SVGMaskElement>>;
  path: StyledFunction<React.ComponentClass<StyledProps<React.SVGProps>>, React.SVGAttributes<SVGPathElement>>;
  pattern: StyledFunction<React.ComponentClass<StyledProps<React.SVGProps>>, React.SVGAttributes<SVGPatternElement>>;
  polygon: StyledFunction<React.ComponentClass<StyledProps<React.SVGProps>>, React.SVGAttributes<SVGPolygonElement>>;
  polyline: StyledFunction<React.ComponentClass<StyledProps<React.SVGProps>>, React.SVGAttributes<SVGPolylineElement>>;
  radialGradient: StyledFunction<React.ComponentClass<StyledProps<React.SVGProps>>, React.SVGAttributes<SVGRadialGradientElement>>;
  rect: StyledFunction<React.ComponentClass<StyledProps<React.SVGProps>>, React.SVGAttributes<SVGRect>>;
  stop: StyledFunction<React.ComponentClass<StyledProps<React.SVGProps>>, React.SVGAttributes<SVGStopElement>>;
  svg: StyledFunction<React.ComponentClass<StyledProps<React.SVGProps>>, React.SVGAttributes<SVGSVGElement>>;
  text: StyledFunction<React.ComponentClass<StyledProps<React.SVGProps>>, React.SVGAttributes<SVGTextElement>>;
  tspan: StyledFunction<React.ComponentClass<StyledProps<React.SVGProps>>, React.SVGAttributes<SVGTSpanElement>>;
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
