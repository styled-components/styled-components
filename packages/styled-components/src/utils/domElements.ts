import type React from 'react';

// prettier-ignore
const elements = [
  'a','abbr','address','area','article','aside','audio','b','bdi','bdo','blockquote','body','button','br','canvas','caption','cite','code','col','colgroup','data','datalist','dd','del','details','dfn','dialog','div','dl','dt','em','embed','fieldset','figcaption','figure','footer','form','h1','h2','h3','h4','h5','h6','header','hgroup','hr','html','i','iframe','img','input','ins','kbd','label','legend','li','main','map','mark','menu','meter','nav','object','ol','optgroup','option','output','p','picture','pre','progress','q','rp','rt','ruby','s','samp','search','section','select','slot','small','span','strong','sub','summary','sup','table','tbody','td','template','textarea','tfoot','th','thead','time','tr','u','ul','var','video','wbr','circle','clipPath','defs','ellipse','feBlend','feColorMatrix','feComponentTransfer','feComposite','feConvolveMatrix','feDiffuseLighting','feDisplacementMap','feDistantLight','feDropShadow','feFlood','feFuncA','feFuncB','feFuncG','feFuncR','feGaussianBlur','feImage','feMerge','feMergeNode','feMorphology','feOffset','fePointLight','feSpecularLighting','feSpotLight','feTile','feTurbulence','filter','foreignObject','g','image','line','linearGradient','marker','mask','path','pattern','polygon','polyline','radialGradient','rect','stop','svg','switch','symbol','text','textPath','tspan','use',
] as const;

export default new Set(elements);

/**
 * Every runtime tag in `elements` that the resolved `@types/react` actually
 * declares as a JSX intrinsic. `<search>` was added to `React.JSX.IntrinsicElements`
 * in `@types/react` 18.2.12 (the oldest supported version, 18.2.6, predates it),
 * so this `Extract` drops it only for a consumer still on 18.2.6-18.2.11. On
 * those versions `styled.search` does not exist on the `styled` object's type
 * (a property-access error) because it is a key of the mapped type built from
 * this union; `styled('search')` still type-checks there, since that goes
 * through `WebTarget`'s general string overload instead, which accepts any
 * string regardless of this union. The runtime shorthand is unaffected either
 * way -- `domElements.forEach` in `constructors/styled.tsx` assigns
 * `styled.search` unconditionally, so only its type is missing. On every
 * other currently-supported @types/react version this resolves to the full
 * list unchanged.
 */
export type SupportedHTMLElements = Extract<
  (typeof elements)[number],
  keyof React.JSX.IntrinsicElements
>;
