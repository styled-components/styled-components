import * as React from "react";
import { StatelessComponent, ComponentClass } from "react";

export interface ThemeProps {
  theme: any;
}

type Component<P> = ComponentClass<P> | StatelessComponent<P>;
export type StyledProps<P> = P & ThemeProps;
export interface InterpolationFunction<P> {
  (props: StyledProps<P>): InterpolationValue<P> | ReadonlyArray<Interpolation<P>>;
}
type InterpolationValue<P> = string | number;
export type Interpolation<P> = InterpolationFunction<P> | InterpolationValue<P> | ReadonlyArray<InterpolationValue<P> | InterpolationFunction<P>>;

export type OuterStyledProps<P> = P & {
  theme?: Object;
  innerRef?: (instance: any) => void;
};

export interface StyledFunction<P> {
  (strings: TemplateStringsArray, ...interpolations: Interpolation<StyledProps<P>>[]): ComponentClass<OuterStyledProps<P>>;
  <U>(strings: TemplateStringsArray, ...interpolations: Interpolation<StyledProps<P & U>>[]): ComponentClass<OuterStyledProps<P & U>>;
}

export type HtmlStyledFunction<E> = StyledFunction<React.HTMLProps<E>>;
export type SvgStyledFunction<E extends SVGElement> = StyledFunction<React.SVGAttributes<E>>;

export interface BaseStyledInterface {
  <P>(component: Component<P>): StyledFunction<P>;
}

export interface StyledInterface extends BaseStyledInterface {
  a: HtmlStyledFunction<HTMLAnchorElement>;
  abbr: HtmlStyledFunction<HTMLElement>;
  address: HtmlStyledFunction<HTMLElement>;
  area: HtmlStyledFunction<HTMLAreaElement>;
  article: HtmlStyledFunction<HTMLElement>;
  aside: HtmlStyledFunction<HTMLElement>;
  audio: HtmlStyledFunction<HTMLAudioElement>;
  b: HtmlStyledFunction<HTMLElement>;
  base: HtmlStyledFunction<HTMLBaseElement>;
  bdi: HtmlStyledFunction<HTMLElement>;
  bdo: HtmlStyledFunction<HTMLElement>;
  big: HtmlStyledFunction<HTMLElement>;
  blockquote: HtmlStyledFunction<HTMLElement>;
  body: HtmlStyledFunction<HTMLBodyElement>;
  br: HtmlStyledFunction<HTMLBRElement>;
  button: HtmlStyledFunction<HTMLButtonElement>;
  canvas: HtmlStyledFunction<HTMLCanvasElement>;
  caption: HtmlStyledFunction<HTMLElement>;
  cite: HtmlStyledFunction<HTMLElement>;
  code: HtmlStyledFunction<HTMLElement>;
  col: HtmlStyledFunction<HTMLTableColElement>;
  colgroup: HtmlStyledFunction<HTMLTableColElement>;
  data: HtmlStyledFunction<HTMLElement>;
  datalist: HtmlStyledFunction<HTMLDataListElement>;
  dd: HtmlStyledFunction<HTMLElement>;
  del: HtmlStyledFunction<HTMLElement>;
  details: HtmlStyledFunction<HTMLElement>;
  dfn: HtmlStyledFunction<HTMLElement>;
  dialog: HtmlStyledFunction<HTMLElement>;
  div: HtmlStyledFunction<HTMLDivElement>;
  dl: HtmlStyledFunction<HTMLDListElement>;
  dt: HtmlStyledFunction<HTMLElement>;
  em: HtmlStyledFunction<HTMLElement>;
  embed: HtmlStyledFunction<HTMLEmbedElement>;
  fieldset: HtmlStyledFunction<HTMLFieldSetElement>;
  figcaption: HtmlStyledFunction<HTMLElement>;
  figure: HtmlStyledFunction<HTMLElement>;
  footer: HtmlStyledFunction<HTMLElement>;
  form: HtmlStyledFunction<HTMLFormElement>;
  h1: HtmlStyledFunction<HTMLHeadingElement>;
  h2: HtmlStyledFunction<HTMLHeadingElement>;
  h3: HtmlStyledFunction<HTMLHeadingElement>;
  h4: HtmlStyledFunction<HTMLHeadingElement>;
  h5: HtmlStyledFunction<HTMLHeadingElement>;
  h6: HtmlStyledFunction<HTMLHeadingElement>;
  head: HtmlStyledFunction<HTMLHeadElement>;
  header: HtmlStyledFunction<HTMLElement>;
  hgroup: HtmlStyledFunction<HTMLElement>;
  hr: HtmlStyledFunction<HTMLHRElement>;
  html: HtmlStyledFunction<HTMLHtmlElement>;
  i: HtmlStyledFunction<HTMLElement>;
  iframe: HtmlStyledFunction<HTMLIFrameElement>;
  img: HtmlStyledFunction<HTMLImageElement>;
  input: HtmlStyledFunction<HTMLInputElement>;
  ins: HtmlStyledFunction<HTMLModElement>;
  kbd: HtmlStyledFunction<HTMLElement>;
  keygen: HtmlStyledFunction<HTMLElement>;
  label: HtmlStyledFunction<HTMLLabelElement>;
  legend: HtmlStyledFunction<HTMLLegendElement>;
  li: HtmlStyledFunction<HTMLLIElement>;
  link: HtmlStyledFunction<HTMLLinkElement>;
  main: HtmlStyledFunction<HTMLElement>;
  map: HtmlStyledFunction<HTMLMapElement>;
  mark: HtmlStyledFunction<HTMLElement>;
  menu: HtmlStyledFunction<HTMLElement>;
  menuitem: HtmlStyledFunction<HTMLElement>;
  meta: HtmlStyledFunction<HTMLMetaElement>;
  meter: HtmlStyledFunction<HTMLElement>;
  nav: HtmlStyledFunction<HTMLElement>;
  noscript: HtmlStyledFunction<HTMLElement>;
  object: HtmlStyledFunction<HTMLObjectElement>;
  ol: HtmlStyledFunction<HTMLOListElement>;
  optgroup: HtmlStyledFunction<HTMLOptGroupElement>;
  option: HtmlStyledFunction<HTMLOptionElement>;
  output: HtmlStyledFunction<HTMLElement>;
  p: HtmlStyledFunction<HTMLParagraphElement>;
  param: HtmlStyledFunction<HTMLParamElement>;
  picture: HtmlStyledFunction<HTMLElement>;
  pre: HtmlStyledFunction<HTMLPreElement>;
  progress: HtmlStyledFunction<HTMLProgressElement>;
  q: HtmlStyledFunction<HTMLQuoteElement>;
  rp: HtmlStyledFunction<HTMLElement>;
  rt: HtmlStyledFunction<HTMLElement>;
  ruby: HtmlStyledFunction<HTMLElement>;
  s: HtmlStyledFunction<HTMLElement>;
  samp: HtmlStyledFunction<HTMLElement>;
  script: HtmlStyledFunction<HTMLElement>;
  section: HtmlStyledFunction<HTMLElement>;
  select: HtmlStyledFunction<HTMLSelectElement>;
  small: HtmlStyledFunction<HTMLElement>;
  source: HtmlStyledFunction<HTMLSourceElement>;
  span: HtmlStyledFunction<HTMLSpanElement>;
  strong: HtmlStyledFunction<HTMLElement>;
  style: HtmlStyledFunction<HTMLStyleElement>;
  sub: HtmlStyledFunction<HTMLElement>;
  summary: HtmlStyledFunction<HTMLElement>;
  sup: HtmlStyledFunction<HTMLElement>;
  table: HtmlStyledFunction<HTMLTableElement>;
  tbody: HtmlStyledFunction<HTMLTableSectionElement>;
  td: HtmlStyledFunction<HTMLTableDataCellElement>;
  textarea: HtmlStyledFunction<HTMLTextAreaElement>;
  tfoot: HtmlStyledFunction<HTMLTableSectionElement>;
  th: HtmlStyledFunction<HTMLTableHeaderCellElement>;
  thead: HtmlStyledFunction<HTMLTableSectionElement>;
  time: HtmlStyledFunction<HTMLElement>;
  title: HtmlStyledFunction<HTMLTitleElement>;
  tr: HtmlStyledFunction<HTMLTableRowElement>;
  track: HtmlStyledFunction<HTMLTrackElement>;
  u: HtmlStyledFunction<HTMLElement>;
  ul: HtmlStyledFunction<HTMLUListElement>;
  "var": HtmlStyledFunction<HTMLElement>;
  video: HtmlStyledFunction<HTMLVideoElement>;
  wbr: HtmlStyledFunction<HTMLElement>;

  // SVG
  circle: SvgStyledFunction<SVGCircleElement>;
  clipPath: SvgStyledFunction<SVGClipPathElement>;
  defs: SvgStyledFunction<SVGDefsElement>;
  ellipse: SvgStyledFunction<SVGEllipseElement>;
  g: SvgStyledFunction<SVGGElement>;
  image: SvgStyledFunction<SVGImageElement>;
  line: SvgStyledFunction<SVGLineElement>;
  linearGradient: SvgStyledFunction<SVGLinearGradientElement>;
  mask: SvgStyledFunction<SVGMaskElement>;
  path: SvgStyledFunction<SVGPathElement>;
  pattern: SvgStyledFunction<SVGPatternElement>;
  polygon: SvgStyledFunction<SVGPolygonElement>;
  polyline: SvgStyledFunction<SVGPolylineElement>;
  radialGradient: SvgStyledFunction<SVGRadialGradientElement>;
  rect: SvgStyledFunction<SVGRectElement>;
  stop: SvgStyledFunction<SVGStopElement>;
  svg: SvgStyledFunction<SVGSVGElement>;
  text: SvgStyledFunction<SVGTextElement>;
  tspan: SvgStyledFunction<SVGTSpanElement>;
}

declare const styled: StyledInterface;

export function css<P>(strings: TemplateStringsArray, ...interpolations: Interpolation<StyledProps<P>>[]): Interpolation<StyledProps<P>>[];
export function keyframes(strings: TemplateStringsArray, ...interpolations: (string | number)[]): string;
export function injectGlobal(strings: TemplateStringsArray, ...interpolations: (string | number)[]): void;

export const ThemeProvider: ComponentClass<ThemeProps>;

export default styled;
