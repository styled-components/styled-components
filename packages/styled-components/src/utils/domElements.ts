import type React from 'react';

// prettier-ignore
const elements = [
  'a','abbr','address','area','article','aside','audio','b','bdi','bdo','blockquote','body','button','br','canvas','caption','cite','code','col','colgroup','data','datalist','dd','del','details','dfn','dialog','div','dl','dt','em','embed','fieldset','figcaption','figure','footer','form','h1','h2','h3','h4','h5','h6','header','hgroup','hr','html','i','iframe','img','input','ins','kbd','label','legend','li','main','map','mark','menu','meter','nav','object','ol','optgroup','option','output','p','picture','pre','progress','q','rp','rt','ruby','s','samp','search','section','select','slot','small','span','strong','sub','summary','sup','table','tbody','td','template','textarea','tfoot','th','thead','time','tr','u','ul','var','video','wbr','circle','clipPath','defs','ellipse','feBlend','feColorMatrix','feComponentTransfer','feComposite','feConvolveMatrix','feDiffuseLighting','feDisplacementMap','feDistantLight','feDropShadow','feFlood','feFuncA','feFuncB','feFuncG','feFuncR','feGaussianBlur','feImage','feMerge','feMergeNode','feMorphology','feOffset','fePointLight','feSpecularLighting','feSpotLight','feTile','feTurbulence','filter','foreignObject','g','image','line','linearGradient','marker','mask','path','pattern','polygon','polyline','radialGradient','rect','stop','svg','switch','symbol','text','textPath','tspan','use',
] as const;

export default new Set(elements);

/**
 * Every runtime tag in `elements` that the resolved `@types/react` actually
 * declares as a JSX intrinsic. `<search>` was added to `React.JSX.IntrinsicElements`
 * after 18.2.6 (the oldest supported patch, #5760), so this `Extract` drops it
 * only for a consumer on that older patch -- `styled.search` keeps working at
 * runtime there via the general `WebTarget` string overload, just without its
 * own strongly-typed shorthand. On every currently-supported @types/react this
 * resolves to the full list unchanged.
 */
export type SupportedHTMLElements = Extract<
  (typeof elements)[number],
  keyof React.JSX.IntrinsicElements
>;
