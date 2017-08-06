import {
  WithOptionalTheme,
  ThemedStyledFunction,
} from './styled-components'

type HTMLStyledComponentFactory<Theme, Props, Element> = ThemedStyledFunction<
  Props,
  Theme,
  WithOptionalTheme<Props, Theme>
>;

export interface HTMLComponentFactory<Theme, Props extends { theme?: Theme; }> {
  a: HTMLStyledComponentFactory<Theme, Props, HTMLAnchorElement>
  abbr: HTMLStyledComponentFactory<Theme, Props, HTMLElement>
  address: HTMLStyledComponentFactory<Theme, Props, HTMLElement>
  area: HTMLStyledComponentFactory<Theme, Props, HTMLAreaElement>
  article: HTMLStyledComponentFactory<Theme, Props, HTMLElement>
  aside: HTMLStyledComponentFactory<Theme, Props, HTMLElement>
  audio: HTMLStyledComponentFactory<Theme, Props, HTMLAudioElement>
  b: HTMLStyledComponentFactory<Theme, Props, HTMLElement>
  base: HTMLStyledComponentFactory<Theme, Props, HTMLBaseElement>
  bdi: HTMLStyledComponentFactory<Theme, Props, HTMLElement>
  bdo: HTMLStyledComponentFactory<Theme, Props, HTMLElement>
  big: HTMLStyledComponentFactory<Theme, Props, HTMLElement>
  blockquote: HTMLStyledComponentFactory<Theme, Props, HTMLElement>
  body: HTMLStyledComponentFactory<Theme, Props, HTMLBodyElement>
  br: HTMLStyledComponentFactory<Theme, Props, HTMLBRElement>
  button: HTMLStyledComponentFactory<Theme, Props, HTMLButtonElement>
  canvas: HTMLStyledComponentFactory<Theme, Props, HTMLCanvasElement>
  caption: HTMLStyledComponentFactory<Theme, Props, HTMLElement>
  cite: HTMLStyledComponentFactory<Theme, Props, HTMLElement>
  code: HTMLStyledComponentFactory<Theme, Props, HTMLElement>
  col: HTMLStyledComponentFactory<Theme, Props, HTMLTableColElement>
  colgroup: HTMLStyledComponentFactory<Theme, Props, HTMLTableColElement>
  data: HTMLStyledComponentFactory<Theme, Props, HTMLElement>
  datalist: HTMLStyledComponentFactory<Theme, Props, HTMLDataListElement>
  dd: HTMLStyledComponentFactory<Theme, Props, HTMLElement>
  del: HTMLStyledComponentFactory<Theme, Props, HTMLElement>
  details: HTMLStyledComponentFactory<Theme, Props, HTMLElement>
  dfn: HTMLStyledComponentFactory<Theme, Props, HTMLElement>
  dialog: HTMLStyledComponentFactory<Theme, Props, HTMLElement>
  div: HTMLStyledComponentFactory<Theme, Props, HTMLDivElement>
  dl: HTMLStyledComponentFactory<Theme, Props, HTMLDListElement>
  dt: HTMLStyledComponentFactory<Theme, Props, HTMLElement>
  em: HTMLStyledComponentFactory<Theme, Props, HTMLElement>
  embed: HTMLStyledComponentFactory<Theme, Props, HTMLEmbedElement>
  fieldset: HTMLStyledComponentFactory<Theme, Props, HTMLFieldSetElement>
  figcaption: HTMLStyledComponentFactory<Theme, Props, HTMLElement>
  figure: HTMLStyledComponentFactory<Theme, Props, HTMLElement>
  footer: HTMLStyledComponentFactory<Theme, Props, HTMLElement>
  form: HTMLStyledComponentFactory<Theme, Props, HTMLFormElement>
  h1: HTMLStyledComponentFactory<Theme, Props, HTMLHeadingElement>
  h2: HTMLStyledComponentFactory<Theme, Props, HTMLHeadingElement>
  h3: HTMLStyledComponentFactory<Theme, Props, HTMLHeadingElement>
  h4: HTMLStyledComponentFactory<Theme, Props, HTMLHeadingElement>
  h5: HTMLStyledComponentFactory<Theme, Props, HTMLHeadingElement>
  h6: HTMLStyledComponentFactory<Theme, Props, HTMLHeadingElement>
  head: HTMLStyledComponentFactory<Theme, Props, HTMLHeadElement>
  header: HTMLStyledComponentFactory<Theme, Props, HTMLElement>
  hgroup: HTMLStyledComponentFactory<Theme, Props, HTMLElement>
  hr: HTMLStyledComponentFactory<Theme, Props, HTMLHRElement>
  html: HTMLStyledComponentFactory<Theme, Props, HTMLHtmlElement>
  i: HTMLStyledComponentFactory<Theme, Props, HTMLElement>
  iframe: HTMLStyledComponentFactory<Theme, Props, HTMLIFrameElement>
  img: HTMLStyledComponentFactory<Theme, Props, HTMLImageElement>
  input: HTMLStyledComponentFactory<Theme, Props, HTMLInputElement>
  ins: HTMLStyledComponentFactory<Theme, Props, HTMLModElement>
  kbd: HTMLStyledComponentFactory<Theme, Props, HTMLElement>
  keygen: HTMLStyledComponentFactory<Theme, Props, HTMLElement>
  label: HTMLStyledComponentFactory<Theme, Props, HTMLLabelElement>
  legend: HTMLStyledComponentFactory<Theme, Props, HTMLLegendElement>
  li: HTMLStyledComponentFactory<Theme, Props, HTMLLIElement>
  link: HTMLStyledComponentFactory<Theme, Props, HTMLLinkElement>
  main: HTMLStyledComponentFactory<Theme, Props, HTMLElement>
  map: HTMLStyledComponentFactory<Theme, Props, HTMLMapElement>
  mark: HTMLStyledComponentFactory<Theme, Props, HTMLElement>
  menu: HTMLStyledComponentFactory<Theme, Props, HTMLElement>
  menuitem: HTMLStyledComponentFactory<Theme, Props, HTMLElement>
  meta: HTMLStyledComponentFactory<Theme, Props, HTMLMetaElement>
  meter: HTMLStyledComponentFactory<Theme, Props, HTMLElement>
  nav: HTMLStyledComponentFactory<Theme, Props, HTMLElement>
  noscript: HTMLStyledComponentFactory<Theme, Props, HTMLElement>
  object: HTMLStyledComponentFactory<Theme, Props, HTMLObjectElement>
  ol: HTMLStyledComponentFactory<Theme, Props, HTMLOListElement>
  optgroup: HTMLStyledComponentFactory<Theme, Props, HTMLOptGroupElement>
  option: HTMLStyledComponentFactory<Theme, Props, HTMLOptionElement>
  output: HTMLStyledComponentFactory<Theme, Props, HTMLElement>
  p: HTMLStyledComponentFactory<Theme, Props, HTMLParagraphElement>
  param: HTMLStyledComponentFactory<Theme, Props, HTMLParamElement>
  picture: HTMLStyledComponentFactory<Theme, Props, HTMLElement>
  pre: HTMLStyledComponentFactory<Theme, Props, HTMLPreElement>
  progress: HTMLStyledComponentFactory<Theme, Props, HTMLProgressElement>
  q: HTMLStyledComponentFactory<Theme, Props, HTMLQuoteElement>
  rp: HTMLStyledComponentFactory<Theme, Props, HTMLElement>
  rt: HTMLStyledComponentFactory<Theme, Props, HTMLElement>
  ruby: HTMLStyledComponentFactory<Theme, Props, HTMLElement>
  s: HTMLStyledComponentFactory<Theme, Props, HTMLElement>
  samp: HTMLStyledComponentFactory<Theme, Props, HTMLElement>
  script: HTMLStyledComponentFactory<Theme, Props, HTMLElement>
  section: HTMLStyledComponentFactory<Theme, Props, HTMLElement>
  select: HTMLStyledComponentFactory<Theme, Props, HTMLSelectElement>
  small: HTMLStyledComponentFactory<Theme, Props, HTMLElement>
  source: HTMLStyledComponentFactory<Theme, Props, HTMLSourceElement>
  span: HTMLStyledComponentFactory<Theme, Props, HTMLSpanElement>
  strong: HTMLStyledComponentFactory<Theme, Props, HTMLElement>
  style: HTMLStyledComponentFactory<Theme, Props, HTMLStyleElement>
  sub: HTMLStyledComponentFactory<Theme, Props, HTMLElement>
  summary: HTMLStyledComponentFactory<Theme, Props, HTMLElement>
  sup: HTMLStyledComponentFactory<Theme, Props, HTMLElement>
  table: HTMLStyledComponentFactory<Theme, Props, HTMLTableElement>
  tbody: HTMLStyledComponentFactory<Theme, Props, HTMLTableSectionElement>
  td: HTMLStyledComponentFactory<Theme, Props, HTMLTableDataCellElement>
  textarea: HTMLStyledComponentFactory<Theme, Props, HTMLTextAreaElement>
  tfoot: HTMLStyledComponentFactory<Theme, Props, HTMLTableSectionElement>
  th: HTMLStyledComponentFactory<Theme, Props, HTMLTableHeaderCellElement>
  thead: HTMLStyledComponentFactory<Theme, Props, HTMLTableSectionElement>
  time: HTMLStyledComponentFactory<Theme, Props, HTMLElement>
  title: HTMLStyledComponentFactory<Theme, Props, HTMLTitleElement>
  tr: HTMLStyledComponentFactory<Theme, Props, HTMLTableRowElement>
  track: HTMLStyledComponentFactory<Theme, Props, HTMLTrackElement>
  u: HTMLStyledComponentFactory<Theme, Props, HTMLElement>
  ul: HTMLStyledComponentFactory<Theme, Props, HTMLUListElement>
  "var": HTMLStyledComponentFactory<Theme, Props, HTMLElement>
  video: HTMLStyledComponentFactory<Theme, Props, HTMLVideoElement>
  wbr: HTMLStyledComponentFactory<Theme, Props, HTMLElement>
}
