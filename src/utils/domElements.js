// @flow
// Thanks to ReactDOMFactories for this handy list!

const htmlElements = {
  a: `
  href target ping rel media hreflang type
  `,
  abbr: `

  `,
  address: `

  `,
  area: `
  alt coords shape href target ping rel media hreflang type
  `,
  article: `

  `,
  aside: `

  `,
  audio: `
  src crossorigin preload autoplay mediagroup loop muted controls
  `,
  b: `

  `,
  base: `
  href target
  `,
  bdi: `

  `,
  bdo: `

  `,
  blockquote: `
  cite
  `,
  body: `
  onafterprint onbeforeprint onbeforeunload onblur onerror onfocus onhashchange onload onmessage onoffline ononline onpagehide onpageshow onpopstate onresize onscroll onstorage onunload
  `,
  br: `

  `,
  button: `
  autofocus disabled form formaction formenctype formmethod formnovalidate formtarget name type value
  `,
  canvas: `
  width height
  `,
  caption: `

  `,
  cite: `

  `,
  code: `

  `,
  col: `
  span
  `,
  colgroup: `
  span
  `,
  command: `
  type label icon disabled checked radiogroup command
  `,
  data: `
  value
  `,
  datalist: `
  option
  `,
  dd: `

  `,
  del: `
  cite datetime
  `,
  details: `
  open
  `,
  dfn: `

  `,
  dialog: `
  open
  `,
  div: `

  `,
  dl: `

  `,
  dt: `

  `,
  em: `

  `,
  embed: `
  src type width height
  `,
  fieldset: `
  disabled form name
  `,
  figcaption: `

  `,
  figure: `

  `,
  footer: `

  `,
  form: `
  accept-charset action autocomplete enctype method name novalidate target
  `,
  h1: `

  `,
  h2: `

  `,
  h3: `

  `,
  h4: `

  `,
  h5: `

  `,
  h6: `

  `,
  head: `

  `,
  header: `

  `,
  hgroup: `

  `,
  hr: `

  `,
  html: `
  manifest
  `,
  i: `

  `,
  iframe: `
  src srcdoc name sandbox seamless width height
  `,
  img: `
  alt src srcset crossorigin usemap ismap width height
  `,
  input: `
  accept alt autocomplete autofocus checked dirname disabled form formaction formenctype formmethod formnovalidate formtarget height inputmode list max maxlength min multiple name pattern placeholder readonly required size src step type value width
  `,
  ins: `
  cite datetime
  `,
  kbd: `

  `,
  keygen: `
  autofocus challenge disabled form keytype name
  `,
  label: `
  form for
  `,
  legend: `

  `,
  li: `
  value
  `,
  link: `
  href rel media hreflang type sizes
  `,
  map: `
  name
  `,
  mark: `

  `,
  menu: `
  type label
  `,
  meta: `
  name http-equiv content charset
  `,
  meter: `
  value min max low high optimum
  `,
  nav: `

  `,
  noscript: `

  `,
  object: `
  data type typemustmatch name usemap form width height
  `,
  ol: `
  reversed start
  `,
  optgroup: `
  disabled label
  `,
  option: `
  disabled label selected value
  `,
  output: `
  for form name
  `,
  p: `

  `,
  param: `
  name value
  `,
  pre: `

  `,
  progress: `
  value max
  `,
  q: `
  cite
  `,
  rp: `

  `,
  rt: `

  `,
  ruby: `

  `,
  s: `

  `,
  samp: `

  `,
  script: `
  src async defer type charset
  `,
  section: `

  `,
  select: `
  autofocus disabled form multiple name required size
  `,
  small: `

  `,
  source: `
  src type media
  `,
  span: `

  `,
  strong: `

  `,
  style: `
  media type scoped
  `,
  sub: `

  `,
  summary: `

  `,
  sup: `

  `,
  table: `

  `,
  tbody: `

  `,
  td: `
  colspan rowspan headers
  `,
  textarea: `
  autocomplete autofocus cols dirname disabled form inputmode maxlength name placeholder readonly required rows wrap
  `,
  tfoot: `

  `,
  th: `
  colspan rowspan headers scope abbr
  `,
  thead: `

  `,
  time: `
  datetime pubdate
  `,
  title: `

  `,
  tr: `

  `,
  track: `
  default kind label src srclang
  `,
  u: `

  `,
  ul: `

  `,
  var: `

  `,
  video: `
  src crossorigin poster preload autoplay mediagroup loop muted controls width height
  `,
  wbr: `

  `,
}

  [
  // SVG
  'circle',
    'clipPath',
    'defs',
    'ellipse',
    'g',
    'image',
    'line',
    'linearGradient',
    'mask',
    'path',
    'pattern',
    'polygon',
    'polyline',
    'radialGradient',
    'rect',
    'stop',
    'svg',
    'text',
    'tspan',
  ]

