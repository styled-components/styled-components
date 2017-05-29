import * as React from "react";
import { StatelessComponent, ComponentClass, PureComponent, ReactElement } from "react";

type Component<P> = ComponentClass<P> | StatelessComponent<P>;

export interface ThemeProps<T> {
  theme: T;
}

export type ThemedStyledProps<P, T> = P & ThemeProps<T>;
export type StyledProps<P> = ThemedStyledProps<P, any>;

export type ThemedOuterStyledProps<P, T> = P & {
  theme?: T;
  innerRef?: (instance: any) => void;
};
export type OuterStyledProps<P> = ThemedOuterStyledProps<P, any>;

export type Interpolation<P> = FlattenInterpolation<P> | ReadonlyArray<FlattenInterpolation<P> | ReadonlyArray<FlattenInterpolation<P>>>;
export type FlattenInterpolation<P> = InterpolationValue | InterpolationFunction<P>;
export type InterpolationValue = string | number;
export type SimpleInterpolation = InterpolationValue | ReadonlyArray<InterpolationValue | ReadonlyArray<InterpolationValue>>;
export interface InterpolationFunction<P> {
  (props: P): Interpolation<P>;
}

export interface StyledComponentClass<P, T> extends ComponentClass<ThemedOuterStyledProps<P, T>> {
  extend: ThemedStyledFunction<P, T>;

  withComponent(
    tag: "abbr" | "address" | "article" | "aside" | "b" | "bdi" | "bdo" |
         "big" | "blockquote" | "caption" | "cite" | "code" | "data" | "dd" |
         "del" | "details" | "dfn" | "dialog" | "dt" | "em" | "figcaption" |
         "figure" | "footer" | "header" | "hgroup" | "l" | "i" | "kbd" |
         "keygen" | "main" | "mark" | "menu" | "menuitem" | "meter" | "nav" |
         "noscript" | "output" | "picture" | "rp" | "rt" | "ruby" | "s" |
         "samp" | "script" | "section" | "small" | "strong" | "sub" |
         "summary" | "sup" | "time" | "u" | "var" | "wbr"
  ): StyledComponentClass<HTMLElement, T>;
  withComponent(tag: "a"): StyledComponentClass<HTMLAnchorElement, T>;
  withComponent(tag: "area"): StyledComponentClass<HTMLAreaElement, T>;
  withComponent(tag: "audio"): StyledComponentClass<HTMLAudioElement, T>;
  withComponent(tag: "base"): StyledComponentClass<HTMLBaseElement, T>;
  withComponent(tag: "body"): StyledComponentClass<HTMLBodyElement, T>;
  withComponent(tag: "br"): StyledComponentClass<HTMLBRElement, T>;
  withComponent(tag: "button"): StyledComponentClass<HTMLButtonElement, T>;
  withComponent(tag: "canvas"): StyledComponentClass<HTMLCanvasElement, T>;
  withComponent(tag: "col" | "colgroup"): StyledComponentClass<HTMLTableColElement, T>;
  withComponent(tag: "datalist"): StyledComponentClass<HTMLDataListElement, T>;
  withComponent(tag: "div"): StyledComponentClass<HTMLDivElement, T>;
  withComponent(tag: "dl"): StyledComponentClass<HTMLDListElement, T>;
  withComponent(tag: "embed"): StyledComponentClass<HTMLEmbedElement, T>;
  withComponent(tag: "fieldset"): StyledComponentClass<HTMLFieldSetElement, T>;
  withComponent(tag: "form"): StyledComponentClass<HTMLFormElement, T>;
  withComponent(tag: "h1" | "h2" | "h3" | "h4" | "h5" | "h6"): StyledComponentClass<HTMLHeadingElement, T>;
  withComponent(tag: "head"): StyledComponentClass<HTMLHeadElement, T>;
  withComponent(tag: "hr"): StyledComponentClass<HTMLHRElement, T>;
  withComponent(tag: "iframe"): StyledComponentClass<HTMLIFrameElement, T>;
  withComponent(tag: "img"): StyledComponentClass<HTMLImageElement, T>;
  withComponent(tag: "input"): StyledComponentClass<HTMLInputElement, T>;
  withComponent(tag: "ins"): StyledComponentClass<HTMLModElement, T>;
  withComponent(tag: "label"): StyledComponentClass<HTMLLabelElement, T>;
  withComponent(tag: "legend"): StyledComponentClass<HTMLLegendElement, T>;
  withComponent(tag: "li"): StyledComponentClass<HTMLLIElement, T>;
  withComponent(tag: "link"): StyledComponentClass<HTMLLinkElement, T>;
  withComponent(tag: "map"): StyledComponentClass<HTMLMapElement, T>;
  withComponent(tag: "meta"): StyledComponentClass<HTMLMetaElement, T>;
  withComponent(tag: "object"): StyledComponentClass<HTMLObjectElement, T>;
  withComponent(tag: "ol"): StyledComponentClass<HTMLOListElement, T>;
  withComponent(tag: "optgroup"): StyledComponentClass<HTMLOptGroupElement, T>;
  withComponent(tag: "option"): StyledComponentClass<HTMLOptionElement, T>;
  withComponent(tag: "p"): StyledComponentClass<HTMLParagraphElement, T>;
  withComponent(tag: "param"): StyledComponentClass<HTMLParamElement, T>;
  withComponent(tag: "pre"): StyledComponentClass<HTMLPreElement, T>;
  withComponent(tag: "progress"): StyledComponentClass<HTMLProgressElement, T>;
  withComponent(tag: "q"): StyledComponentClass<HTMLQuoteElement, T>;
  withComponent(tag: "select"): StyledComponentClass<HTMLSelectElement, T>;
  withComponent(tag: "source"): StyledComponentClass<HTMLSourceElement, T>;
  withComponent(tag: "span"): StyledComponentClass<HTMLSpanElement, T>;
  withComponent(tag: "style"): StyledComponentClass<HTMLStyleElement, T>;
  withComponent(tag: "table"): StyledComponentClass<HTMLTableElement, T>;
  withComponent(tag: "tbody"): StyledComponentClass<HTMLTableSectionElement, T>;
  withComponent(tag: "td"): StyledComponentClass<HTMLTableDataCellElement, T>;
  withComponent(tag: "textarea"): StyledComponentClass<HTMLTextAreaElement, T>;
  withComponent(tag: "tfoot"): StyledComponentClass<HTMLTableSectionElement, T>;
  withComponent(tag: "th"): StyledComponentClass<HTMLTableHeaderCellElement, T>;
  withComponent(tag: "thead"): StyledComponentClass<HTMLTableSectionElement, T>;
  withComponent(tag: "title"): StyledComponentClass<HTMLTitleElement, T>;
  withComponent(tag: "tr"): StyledComponentClass<HTMLTableRowElement, T>;
  withComponent(tag: "track"): StyledComponentClass<HTMLTrackElement, T>;
  withComponent(tag: "ul"): StyledComponentClass<HTMLUListElement, T>;
  withComponent(tag: "video"): StyledComponentClass<HTMLVideoElement, T>;

  // SVG
  withComponent(tag: "circle"): StyledComponentClass<SVGCircleElement, T>;
  withComponent(tag: "clipPath"): StyledComponentClass<SVGClipPathElement, T>;
  withComponent(tag: "defs"): StyledComponentClass<SVGDefsElement, T>;
  withComponent(tag: "ellipse"): StyledComponentClass<SVGEllipseElement, T>;
  withComponent(tag: "g"): StyledComponentClass<SVGGElement, T>;
  withComponent(tag: "image"): StyledComponentClass<SVGImageElement, T>;
  withComponent(tag: "line"): StyledComponentClass<SVGLineElement, T>;
  withComponent(tag: "linearGradient"): StyledComponentClass<SVGLinearGradientElement, T>;
  withComponent(tag: "mask"): StyledComponentClass<SVGMaskElement, T>;
  withComponent(tag: "path"): StyledComponentClass<SVGPathElement, T>;
  withComponent(tag: "pattern"): StyledComponentClass<SVGPatternElement, T>;
  withComponent(tag: "polygon"): StyledComponentClass<SVGPolygonElement, T>;
  withComponent(tag: "polyline"): StyledComponentClass<SVGPolylineElement, T>;
  withComponent(tag: "radialGradient"): StyledComponentClass<SVGRadialGradientElement, T>;
  withComponent(tag: "rect"): StyledComponentClass<SVGRectElement, T>;
  withComponent(tag: "stop"): StyledComponentClass<SVGStopElement, T>;
  withComponent(tag: "svg"): StyledComponentClass<SVGSVGElement, T>;
  withComponent(tag: "text"): StyledComponentClass<SVGTextElement, T>;
  withComponent(tag: "tspan"): StyledComponentClass<SVGTSpanElement, T>;

  withComponent(element: ComponentClass<P>): StyledComponentClass<ComponentClass<P>, T>;
}

export interface ThemedStyledFunction<P, T> {
  (strings: TemplateStringsArray, ...interpolations: Interpolation<ThemedStyledProps<P, T>>[]): StyledComponentClass<P, T>;
  <U>(strings: TemplateStringsArray, ...interpolations: Interpolation<ThemedStyledProps<P & U, T>>[]): StyledComponentClass<P, T>;
}
export type StyledFunction<P> = ThemedStyledFunction<P, any>;

export type ThemedHtmlStyledFunction<E, T> = ThemedStyledFunction<React.HTMLProps<E>, T>;
export type HtmlStyledFunction<E> = ThemedHtmlStyledFunction<E, any>;

export type ThemedSvgStyledFunction<E extends SVGElement, T> = ThemedStyledFunction<React.SVGAttributes<E>, T>;
export type SvgStyledFunction<E extends SVGElement> = ThemedSvgStyledFunction<E, any>;

export interface ThemedBaseStyledInterface<T> {
  <P>(component: Component<P>): ThemedStyledFunction<P, T>;
}
export type BaseStyledInterface = ThemedBaseStyledInterface<any>;

export type StyledInterface = ThemedStyledInterface<any>;
export interface ThemedStyledInterface<T> extends ThemedBaseStyledInterface<T> {
  a: ThemedHtmlStyledFunction<HTMLAnchorElement, T>;
  abbr: ThemedHtmlStyledFunction<HTMLElement, T>;
  address: ThemedHtmlStyledFunction<HTMLElement, T>;
  area: ThemedHtmlStyledFunction<HTMLAreaElement, T>;
  article: ThemedHtmlStyledFunction<HTMLElement, T>;
  aside: ThemedHtmlStyledFunction<HTMLElement, T>;
  audio: ThemedHtmlStyledFunction<HTMLAudioElement, T>;
  b: ThemedHtmlStyledFunction<HTMLElement, T>;
  base: ThemedHtmlStyledFunction<HTMLBaseElement, T>;
  bdi: ThemedHtmlStyledFunction<HTMLElement, T>;
  bdo: ThemedHtmlStyledFunction<HTMLElement, T>;
  big: ThemedHtmlStyledFunction<HTMLElement, T>;
  blockquote: ThemedHtmlStyledFunction<HTMLElement, T>;
  body: ThemedHtmlStyledFunction<HTMLBodyElement, T>;
  br: ThemedHtmlStyledFunction<HTMLBRElement, T>;
  button: ThemedHtmlStyledFunction<HTMLButtonElement, T>;
  canvas: ThemedHtmlStyledFunction<HTMLCanvasElement, T>;
  caption: ThemedHtmlStyledFunction<HTMLElement, T>;
  cite: ThemedHtmlStyledFunction<HTMLElement, T>;
  code: ThemedHtmlStyledFunction<HTMLElement, T>;
  col: ThemedHtmlStyledFunction<HTMLTableColElement, T>;
  colgroup: ThemedHtmlStyledFunction<HTMLTableColElement, T>;
  data: ThemedHtmlStyledFunction<HTMLElement, T>;
  datalist: ThemedHtmlStyledFunction<HTMLDataListElement, T>;
  dd: ThemedHtmlStyledFunction<HTMLElement, T>;
  del: ThemedHtmlStyledFunction<HTMLElement, T>;
  details: ThemedHtmlStyledFunction<HTMLElement, T>;
  dfn: ThemedHtmlStyledFunction<HTMLElement, T>;
  dialog: ThemedHtmlStyledFunction<HTMLElement, T>;
  div: ThemedHtmlStyledFunction<HTMLDivElement, T>;
  dl: ThemedHtmlStyledFunction<HTMLDListElement, T>;
  dt: ThemedHtmlStyledFunction<HTMLElement, T>;
  em: ThemedHtmlStyledFunction<HTMLElement, T>;
  embed: ThemedHtmlStyledFunction<HTMLEmbedElement, T>;
  fieldset: ThemedHtmlStyledFunction<HTMLFieldSetElement, T>;
  figcaption: ThemedHtmlStyledFunction<HTMLElement, T>;
  figure: ThemedHtmlStyledFunction<HTMLElement, T>;
  footer: ThemedHtmlStyledFunction<HTMLElement, T>;
  form: ThemedHtmlStyledFunction<HTMLFormElement, T>;
  h1: ThemedHtmlStyledFunction<HTMLHeadingElement, T>;
  h2: ThemedHtmlStyledFunction<HTMLHeadingElement, T>;
  h3: ThemedHtmlStyledFunction<HTMLHeadingElement, T>;
  h4: ThemedHtmlStyledFunction<HTMLHeadingElement, T>;
  h5: ThemedHtmlStyledFunction<HTMLHeadingElement, T>;
  h6: ThemedHtmlStyledFunction<HTMLHeadingElement, T>;
  head: ThemedHtmlStyledFunction<HTMLHeadElement, T>;
  header: ThemedHtmlStyledFunction<HTMLElement, T>;
  hgroup: ThemedHtmlStyledFunction<HTMLElement, T>;
  hr: ThemedHtmlStyledFunction<HTMLHRElement, T>;
  html: ThemedHtmlStyledFunction<HTMLHtmlElement, T>;
  i: ThemedHtmlStyledFunction<HTMLElement, T>;
  iframe: ThemedHtmlStyledFunction<HTMLIFrameElement, T>;
  img: ThemedHtmlStyledFunction<HTMLImageElement, T>;
  input: ThemedHtmlStyledFunction<HTMLInputElement, T>;
  ins: ThemedHtmlStyledFunction<HTMLModElement, T>;
  kbd: ThemedHtmlStyledFunction<HTMLElement, T>;
  keygen: ThemedHtmlStyledFunction<HTMLElement, T>;
  label: ThemedHtmlStyledFunction<HTMLLabelElement, T>;
  legend: ThemedHtmlStyledFunction<HTMLLegendElement, T>;
  li: ThemedHtmlStyledFunction<HTMLLIElement, T>;
  link: ThemedHtmlStyledFunction<HTMLLinkElement, T>;
  main: ThemedHtmlStyledFunction<HTMLElement, T>;
  map: ThemedHtmlStyledFunction<HTMLMapElement, T>;
  mark: ThemedHtmlStyledFunction<HTMLElement, T>;
  menu: ThemedHtmlStyledFunction<HTMLElement, T>;
  menuitem: ThemedHtmlStyledFunction<HTMLElement, T>;
  meta: ThemedHtmlStyledFunction<HTMLMetaElement, T>;
  meter: ThemedHtmlStyledFunction<HTMLElement, T>;
  nav: ThemedHtmlStyledFunction<HTMLElement, T>;
  noscript: ThemedHtmlStyledFunction<HTMLElement, T>;
  object: ThemedHtmlStyledFunction<HTMLObjectElement, T>;
  ol: ThemedHtmlStyledFunction<HTMLOListElement, T>;
  optgroup: ThemedHtmlStyledFunction<HTMLOptGroupElement, T>;
  option: ThemedHtmlStyledFunction<HTMLOptionElement, T>;
  output: ThemedHtmlStyledFunction<HTMLElement, T>;
  p: ThemedHtmlStyledFunction<HTMLParagraphElement, T>;
  param: ThemedHtmlStyledFunction<HTMLParamElement, T>;
  picture: ThemedHtmlStyledFunction<HTMLElement, T>;
  pre: ThemedHtmlStyledFunction<HTMLPreElement, T>;
  progress: ThemedHtmlStyledFunction<HTMLProgressElement, T>;
  q: ThemedHtmlStyledFunction<HTMLQuoteElement, T>;
  rp: ThemedHtmlStyledFunction<HTMLElement, T>;
  rt: ThemedHtmlStyledFunction<HTMLElement, T>;
  ruby: ThemedHtmlStyledFunction<HTMLElement, T>;
  s: ThemedHtmlStyledFunction<HTMLElement, T>;
  samp: ThemedHtmlStyledFunction<HTMLElement, T>;
  script: ThemedHtmlStyledFunction<HTMLElement, T>;
  section: ThemedHtmlStyledFunction<HTMLElement, T>;
  select: ThemedHtmlStyledFunction<HTMLSelectElement, T>;
  small: ThemedHtmlStyledFunction<HTMLElement, T>;
  source: ThemedHtmlStyledFunction<HTMLSourceElement, T>;
  span: ThemedHtmlStyledFunction<HTMLSpanElement, T>;
  strong: ThemedHtmlStyledFunction<HTMLElement, T>;
  style: ThemedHtmlStyledFunction<HTMLStyleElement, T>;
  sub: ThemedHtmlStyledFunction<HTMLElement, T>;
  summary: ThemedHtmlStyledFunction<HTMLElement, T>;
  sup: ThemedHtmlStyledFunction<HTMLElement, T>;
  table: ThemedHtmlStyledFunction<HTMLTableElement, T>;
  tbody: ThemedHtmlStyledFunction<HTMLTableSectionElement, T>;
  td: ThemedHtmlStyledFunction<HTMLTableDataCellElement, T>;
  textarea: ThemedHtmlStyledFunction<HTMLTextAreaElement, T>;
  tfoot: ThemedHtmlStyledFunction<HTMLTableSectionElement, T>;
  th: ThemedHtmlStyledFunction<HTMLTableHeaderCellElement, T>;
  thead: ThemedHtmlStyledFunction<HTMLTableSectionElement, T>;
  time: ThemedHtmlStyledFunction<HTMLElement, T>;
  title: ThemedHtmlStyledFunction<HTMLTitleElement, T>;
  tr: ThemedHtmlStyledFunction<HTMLTableRowElement, T>;
  track: ThemedHtmlStyledFunction<HTMLTrackElement, T>;
  u: ThemedHtmlStyledFunction<HTMLElement, T>;
  ul: ThemedHtmlStyledFunction<HTMLUListElement, T>;
  "var": ThemedHtmlStyledFunction<HTMLElement, T>;
  video: ThemedHtmlStyledFunction<HTMLVideoElement, T>;
  wbr: ThemedHtmlStyledFunction<HTMLElement, T>;

  // SVG
  circle: ThemedSvgStyledFunction<SVGCircleElement, T>;
  clipPath: ThemedSvgStyledFunction<SVGClipPathElement, T>;
  defs: ThemedSvgStyledFunction<SVGDefsElement, T>;
  ellipse: ThemedSvgStyledFunction<SVGEllipseElement, T>;
  g: ThemedSvgStyledFunction<SVGGElement, T>;
  image: ThemedSvgStyledFunction<SVGImageElement, T>;
  line: ThemedSvgStyledFunction<SVGLineElement, T>;
  linearGradient: ThemedSvgStyledFunction<SVGLinearGradientElement, T>;
  mask: ThemedSvgStyledFunction<SVGMaskElement, T>;
  path: ThemedSvgStyledFunction<SVGPathElement, T>;
  pattern: ThemedSvgStyledFunction<SVGPatternElement, T>;
  polygon: ThemedSvgStyledFunction<SVGPolygonElement, T>;
  polyline: ThemedSvgStyledFunction<SVGPolylineElement, T>;
  radialGradient: ThemedSvgStyledFunction<SVGRadialGradientElement, T>;
  rect: ThemedSvgStyledFunction<SVGRectElement, T>;
  stop: ThemedSvgStyledFunction<SVGStopElement, T>;
  svg: ThemedSvgStyledFunction<SVGSVGElement, T>;
  text: ThemedSvgStyledFunction<SVGTextElement, T>;
  tspan: ThemedSvgStyledFunction<SVGTSpanElement, T>;
}

export type ThemeProviderComponent<T> = ComponentClass<ThemeProps<T>>;

export interface ThemedCssFunction<T> {
  (strings: TemplateStringsArray, ...interpolations: SimpleInterpolation[]): InterpolationValue[];
  <P>(strings: TemplateStringsArray, ...interpolations: Interpolation<ThemedStyledProps<P, T>>[]): FlattenInterpolation<ThemedStyledProps<P, T>>[];
}

export interface ThemedStyledComponentsModule<T> {
  default: ThemedStyledInterface<T>;

  css: ThemedCssFunction<T>;
  keyframes(strings: TemplateStringsArray, ...interpolations: SimpleInterpolation[]): string;
  injectGlobal(strings: TemplateStringsArray, ...interpolations: SimpleInterpolation[]): void;
  withTheme<P extends { theme?: T; }, T>(component: Component<P>): ComponentClass<P>;

  ThemeProvider: ThemeProviderComponent<T>;
}

declare const styled: StyledInterface;

export const css: ThemedCssFunction<any>;
export function withTheme<P extends { theme?: T; }, T>(component: Component<P>): ComponentClass<P>;

export function keyframes(strings: TemplateStringsArray, ...interpolations: SimpleInterpolation[]): string;
export function injectGlobal(strings: TemplateStringsArray, ...interpolations: SimpleInterpolation[]): void;

export const ThemeProvider: ThemeProviderComponent<any>;

export class StyleSheetManager extends React.Component<{ sheet: ServerStyleSheet }, any> { }

export class ServerStyleSheet {
  collectStyles(children: ReactElement<any>): StyleSheetManager
  collectStyles(tree: any): StyleSheetManager;
  getStyleTags(): string;
  getStyleElement(): ReactElement<any>[]
  static create(): StyleSheet
}

export default styled;
