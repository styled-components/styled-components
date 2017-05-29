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


interface HtmlTags {
  a: HTMLAnchorElement;
  abbr: HTMLElement;
  address: HTMLElement;
  area: HTMLAreaElement;
  article: HTMLElement;
  aside: HTMLElement;
  audio: HTMLAudioElement;
  b: HTMLElement;
  base: HTMLBaseElement;
  bdi: HTMLElement;
  bdo: HTMLElement;
  big: HTMLElement;
  blockquote: HTMLElement;
  body: HTMLBodyElement;
  br: HTMLBRElement;
  button: HTMLButtonElement;
  canvas: HTMLCanvasElement;
  caption: HTMLElement;
  cite: HTMLElement;
  code: HTMLElement;
  col: HTMLTableColElement;
  colgroup: HTMLTableColElement;
  data: HTMLElement;
  datalist: HTMLDataListElement;
  dd: HTMLElement;
  del: HTMLElement;
  details: HTMLElement;
  dfn: HTMLElement;
  dialog: HTMLElement;
  div: HTMLDivElement;
  dl: HTMLDListElement;
  dt: HTMLElement;
  em: HTMLElement;
  embed: HTMLEmbedElement;
  fieldset: HTMLFieldSetElement;
  figcaption: HTMLElement;
  figure: HTMLElement;
  footer: HTMLElement;
  form: HTMLFormElement;
  h1: HTMLHeadingElement;
  h2: HTMLHeadingElement;
  h3: HTMLHeadingElement;
  h4: HTMLHeadingElement;
  h5: HTMLHeadingElement;
  h6: HTMLHeadingElement;
  head: HTMLHeadElement;
  header: HTMLElement;
  hgroup: HTMLElement;
  hr: HTMLHRElement;
  html: HTMLHtmlElement;
  i: HTMLElement;
  iframe: HTMLIFrameElement;
  img: HTMLImageElement;
  input: HTMLInputElement;
  ins: HTMLModElement;
  kbd: HTMLElement;
  keygen: HTMLElement;
  label: HTMLLabelElement;
  legend: HTMLLegendElement;
  li: HTMLLIElement;
  link: HTMLLinkElement;
  main: HTMLElement;
  map: HTMLMapElement;
  mark: HTMLElement;
  menu: HTMLElement;
  menuitem: HTMLElement;
  meta: HTMLMetaElement;
  meter: HTMLElement;
  nav: HTMLElement;
  noscript: HTMLElement;
  object: HTMLObjectElement;
  ol: HTMLOListElement;
  optgroup: HTMLOptGroupElement;
  option: HTMLOptionElement;
  output: HTMLElement;
  p: HTMLParagraphElement;
  param: HTMLParamElement;
  picture: HTMLElement;
  pre: HTMLPreElement;
  progress: HTMLProgressElement;
  q: HTMLQuoteElement;
  rp: HTMLElement;
  rt: HTMLElement;
  ruby: HTMLElement;
  s: HTMLElement;
  samp: HTMLElement;
  script: HTMLElement;
  section: HTMLElement;
  select: HTMLSelectElement;
  small: HTMLElement;
  source: HTMLSourceElement;
  span: HTMLSpanElement;
  strong: HTMLElement;
  style: HTMLStyleElement;
  sub: HTMLElement;
  summary: HTMLElement;
  sup: HTMLElement;
  table: HTMLTableElement;
  tbody: HTMLTableSectionElement;
  td: HTMLTableDataCellElement;
  textarea: HTMLTextAreaElement;
  tfoot: HTMLTableSectionElement;
  th: HTMLTableHeaderCellElement;
  thead: HTMLTableSectionElement;
  time: HTMLElement;
  title: HTMLTitleElement;
  tr: HTMLTableRowElement;
  track: HTMLTrackElement;
  u: HTMLElement;
  ul: HTMLUListElement;
  "var": HTMLElement;
  video: HTMLVideoElement;
  wbr: HTMLElement;
}

interface SVGTags {
  circle: SVGCircleElement;
  clipPath: SVGClipPathElement;
  defs: SVGDefsElement;
  ellipse: SVGEllipseElement;
  g: SVGGElement;
  image: SVGImageElement;
  line: SVGLineElement;
  linearGradient: SVGLinearGradientElement;
  mask: SVGMaskElement;
  path: SVGPathElement;
  pattern: SVGPatternElement;
  polygon: SVGPolygonElement;
  polyline: SVGPolylineElement;
  radialGradient: SVGRadialGradientElement;
  rect: SVGRectElement;
  stop: SVGStopElement;
  svg: SVGSVGElement;
  text: SVGTextElement;
  tspan: SVGTSpanElement;
}

type WithComponentOverloads<Tags, T> = {
  [K in keyof Tags]: StyledComponentClass<Tags[K], T>;
};

export interface StyledComponentClass<P, T> extends ComponentClass<ThemedOuterStyledProps<P, T>> {
  extend: ThemedStyledFunction<P, T>;

  withComponent<K extends keyof HtmlTags>(tag: K): WithComponentOverloads<HtmlTags, T>[K];
  withComponent<K extends keyof SVGTags>(tag: K): WithComponentOverloads<SVGTags, T>[K];
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
