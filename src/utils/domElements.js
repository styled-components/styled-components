// @flow
// Thanks to https://simon.html5.org/html-elements and MDN for this info!

const toObj = (keys, val) => {
  const obj = {}
  keys.trim().replace(/s+/).forEach(k => obj[k] = val)
  return obj
}
const globalHtmlAttrs = toObj(`
  accesskey class contenteditable contextmenu dir draggable dropzone hidden id
  inert itemid itemprop itemref itemscope itemtype lang role spellcheck style
  tabindex title translate
`, true)

const attrs = globals => str => !str ? globals :
  Object.create(globals, toObj(str, { value: true, iterable: true }))
const html = attrs(globalHtmlAttrs)

export const htmlElements = {
  a: html(`href target ping rel media hreflang type`),
  abbr: html(``),
  address: html(``),
  area: html(`alt coords shape href target ping rel media hreflang type`),
  article: html(``),
  aside: html(``),
  audio: html(`src crossorigin preload autoplay mediagroup loop muted controls`),
  b: html(``),
  base: html(`href target`),
  bdi: html(``),
  bdo: html(``),
  big: html(``),
  blockquote: html(`cite`),
  body: html(`
    onafterprint onbeforeprint onbeforeunload onblur onerror onfocus onhashchange 
    onload onmessage onoffline ononline onpagehide onpageshow onpopstate onresize 
    onscroll onstorage onunload
  `),
  br: html(``),
  button: html(`
    autofocus disabled form formaction formenctype formmethod 
    formnovalidate formtarget name type value
  `),
  canvas: html(`width height`),
  caption: html(``),
  cite: html(``),
  code: html(``),
  col: html(`span`),
  colgroup: html(`span`),
  command: html(`type label icon disabled checked radiogroup command`),
  data: html(`value`),
  datalist: html(`option`),
  dd: html(``),
  del: html(`cite datetime`),
  details: html(`open`),
  dfn: html(``),
  dialog: html(`open`),
  div: html(``),
  dl: html(``),
  dt: html(``),
  em: html(``),
  embed: html(`src type width height`),
  fieldset: html(`disabled form name`),
  figcaption: html(``),
  figure: html(``),
  footer: html(``),
  form: html(`
    accept-charset action autocomplete enctype method name novalidate target
  `),
  h1: html(``),
  h2: html(``),
  h3: html(``),
  h4: html(``),
  h5: html(``),
  h6: html(``),
  head: html(``),
  header: html(``),
  hgroup: html(``),
  hr: html(``),
  html: html(`manifest`),
  i: html(``),
  iframe: html(`src srcdoc name sandbox seamless width height`),
  img: html(`alt src srcset crossorigin usemap ismap width height`),
  input: html(`
    accept alt autocomplete autofocus checked dirname disabled form formaction 
    formenctype formmethod formnovalidate formtarget height inputmode list max 
    maxlength min multiple name pattern placeholder readonly required size src 
    step type value width
  `),
  ins: html(`cite datetime`),
  kbd: html(``),
  keygen: html(`autofocus challenge disabled form keytype name`),
  label: html(`form for`),
  legend: html(``),
  li: html(`value`),
  link: html(`href rel media hreflang type sizes`),
  main: html(``),
  map: html(`name`),
  mark: html(``),
  menu: html(`type label`),
  menuitem: html(`checked command default disabled icon label radiogroup type`),
  meta: html(`name http-equiv content charset`),
  meter: html(`value min max low high optimum`),
  nav: html(``),
  noscript: html(``),
  object: html(`data type typemustmatch name usemap form width height`),
  ol: html(`reversed start`),
  optgroup: html(`disabled label`),
  option: html(`disabled label selected value`),
  output: html(`for form name`),
  p: html(``),
  param: html(``),
  picture: html(``),
  pre: html(``),
  progress: html(`value max`),
  q: html(`cite`),
  rp: html(``),
  rt: html(``),
  ruby: html(``),
  s: html(``),
  samp: html(``),
  script: html(`src async defer type charset`),
  section: html(``),
  select: html(`autofocus disabled form multiple name required size`),
  small: html(``),
  source: html(`src type media`),
  span: html(``),
  strong: html(``),
  style: html(`media type scoped`),
  sub: html(``),
  summary: html(``),
  sup: html(``),
  table: html(``),
  tbody: html(``),
  td: html(`colspan rowspan headers`),
  textarea: html(`
    autocomplete autofocus cols dirname disabled form inputmode maxlength name 
    placeholder readonly required rows wrap
  `),
  tfoot: html(``),
  th: html(`colspan rowspan headers scope abbr`),
  thead: html(``),
  time: html(`datetime pubdate`),
  title: html(``),
  tr: html(``),
  track: html(`default kind label src srclang`),
  u: html(``),
  ul: html(``),
  var: html(``),
  video: html(`
    src crossorigin poster preload autoplay mediagroup loop muted controls 
    width height
  `),
  wbr: html(``),
}

/* SVG has so many props, it's simpler to just default to passing
 * everything and let people blacklist what they want. */
const all = { default: true }
const svgElements = {
  circle: all,
  clipPath: all,
  defs: all,
  ellipse: all,
  g: all,
  image: all,
  line: all,
  linearGradient: all,
  mask: all,
  path: all,
  pattern: all,
  polygon: all,
  polyline: all,
  radialGradient: all,
  rect: all,
  stop: all,
  svg: all,
  text: all,
  tspan: all,
}

export default { ...htmlElements, ...svgElements }
