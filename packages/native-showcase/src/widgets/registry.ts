import { ComponentType } from 'react';
import { AspectRatioGallery } from './AspectRatioGallery';
import { AttributeVariants } from './AttributeVariants';
import { BackgroundBlendStudio } from './BackgroundBlendStudio';
import { BackgroundShorthandBoard } from './BackgroundShorthandBoard';
import { BlendModeBoard } from './BlendModeBoard';
import { ColorFunctionsLab } from './ColorFunctionsLab';
import { CompositeRules } from './CompositeRules';
import { ContainerQueryCard } from './ContainerQueryCard';
import { ContainerUnitsKnob } from './ContainerUnitsKnob';
import { DirectionBoard } from './DirectionBoard';
import { FieldSizingBoard } from './FieldSizingBoard';
import { FilterStack } from './FilterStack';
import { GradientPalette } from './GradientPalette';
import { GridLayoutBoard } from './GridLayoutBoard';
import { InteractivityBoard } from './InteractivityBoard';
import { KeyframeOrchestra } from './KeyframeOrchestra';
import { LightDarkSwatch } from './LightDarkSwatch';
import { LogicalSpacingDial } from './LogicalSpacingDial';
import { MathFunctionsLab } from './MathFunctionsLab';
import { MediaRangeBars } from './MediaRangeBars';
import { PlaceShelf } from './PlaceShelf';
import { PressInteractive } from './PressInteractive';
import { RelativeUnitsScale } from './RelativeUnitsScale';
import { SelectorComboBoard } from './SelectorComboBoard';
import { SiblingNthBoard } from './SiblingNthBoard';
import { HasSelectorBoard } from './HasSelectorBoard';
import { ReducedMotionBeacon } from './ReducedMotionBeacon';
import { SafeAreaInsetsBadge } from './SafeAreaInsetsBadge';
import { ShadowComposer } from './ShadowComposer';
import { StandaloneTransforms } from './StandaloneTransforms';
import { SystemColorsBoard } from './SystemColorsBoard';
import { TextDecorationAlignment } from './TextDecorationAlignment';
import { TextInputAlignment } from './TextInputAlignment';
import { TextWrapShelf } from './TextWrapShelf';
import { ThemeOverrides } from './ThemeOverrides';
import { TransformPlayground } from './TransformPlayground';
import { TransitionGallery } from './TransitionGallery';
import { TypeFeaturesShelf } from './TypeFeaturesShelf';
import { ViewportUnitsRibbon } from './ViewportUnitsRibbon';

export type FidgetCategory =
  | 'Color'
  | 'Visual effects'
  | 'Animation'
  | 'Layout'
  | 'Typography'
  | 'Math & units'
  | 'Responsive environment'
  | 'Selectors & state'
  | 'Theming';

export interface FidgetEntry {
  slug: string;
  title: string;
  summary: string;
  feature: string;
  category: FidgetCategory;
  Widget: ComponentType;
}

export const fidgets: ReadonlyArray<FidgetEntry> = [
  {
    slug: 'light-dark-swatch',
    title: 'Light-dark swatch',
    summary: 'Two swatches: one uses `light-dark()`, one uses `prefers-color-scheme` media query.',
    feature: 'light-dark()',
    category: 'Color',
    Widget: LightDarkSwatch,
  },
  {
    slug: 'color-functions-lab',
    title: 'Modern color functions',
    summary:
      '`oklch`, `oklab`, `lab`, `lch`, and `color-mix` — literal arguments fold to hex at transform time on RN; rn-web hands them to the browser engine directly.',
    feature: 'oklch / color-mix',
    category: 'Color',
    Widget: ColorFunctionsLab,
  },
  {
    slug: 'system-colors-board',
    title: 'CSS system colors',
    summary:
      'UA / platform keywords (`Canvas`, `CanvasText`, `Field`, `Highlight`, `LinkText`, …) fold to a `light-dark()` expansion so the same declaration paints correctly under both light and dark schemes on every platform.',
    feature: 'CSS Color 4 §6.2',
    category: 'Color',
    Widget: SystemColorsBoard,
  },
  {
    slug: 'gradient-palette',
    title: 'Gradients',
    summary: 'Linear, radial, layered. Theme tokens resolve into gradient stops at render time.',
    feature: 'linear/radial-gradient',
    category: 'Visual effects',
    Widget: GradientPalette,
  },
  {
    slug: 'filter-stack',
    title: 'Filters',
    summary:
      '`blur`, `saturate`, `hue-rotate`, `drop-shadow`. Pass-through to the RN 0.83+ string parser.',
    feature: 'filter',
    category: 'Visual effects',
    Widget: FilterStack,
  },
  {
    slug: 'shadow-composer',
    title: 'Box shadows',
    summary:
      'Soft, layered, `inset`, spread, theme-colored. RN 0.84+ supports `inset` and `spread`.',
    feature: 'box-shadow',
    category: 'Visual effects',
    Widget: ShadowComposer,
  },
  {
    slug: 'transform-playground',
    title: 'Transforms',
    summary:
      '`translate`, `rotate` + `scale`, `skew`. Theme tokens resolve into the transform value at render time.',
    feature: 'transform',
    category: 'Visual effects',
    Widget: TransformPlayground,
  },
  {
    slug: 'standalone-transforms',
    title: 'Standalone transform properties',
    summary:
      '`translate`, `rotate`, `scale` as independent properties (CSS Transforms L2). Each declaration cascades on its own — no `transform:` array required.',
    feature: 'translate / rotate / scale',
    category: 'Visual effects',
    Widget: StandaloneTransforms,
  },
  {
    slug: 'transition-gallery',
    title: 'Transitions · property matrix',
    summary:
      'Tap each row to toggle between two values. One row per transitioning property type — `opacity`, colors, `border-radius`, `transform` variants, layout dimensions, multi-prop, `transition: all`, plus `steps()` and `linear()` easings.',
    feature: 'transition · all property types',
    category: 'Animation',
    Widget: TransitionGallery,
  },
  {
    slug: 'keyframe-orchestra',
    title: 'Keyframe animations',
    summary:
      'CSS `@keyframes` with inline definitions — spin, breathe, jelly squash-and-stretch, 3D card flip, color wave, and staggered entrance. All native-thread. Play/pause via `animation-play-state`.',
    feature: '@keyframes · animation',
    category: 'Animation',
    Widget: KeyframeOrchestra,
  },
  {
    slug: 'blend-mode-board',
    title: 'Blend modes',
    summary: '`mix-blend-mode` + `isolation` create a composited stacking context. RN 0.85+.',
    feature: 'mix-blend-mode',
    category: 'Visual effects',
    Widget: BlendModeBoard,
  },
  {
    slug: 'background-shorthand',
    title: 'Background shorthand',
    summary:
      'Single `background:` declaration expands to eight longhands per CSS Backgrounds 3 §2.10. Comma-layered, position/size split by slash, color on the final layer.',
    feature: 'background shorthand',
    category: 'Visual effects',
    Widget: BackgroundShorthandBoard,
  },
  {
    slug: 'background-blend-studio',
    title: 'Background blend modes',
    summary:
      '`background-blend-mode` keyword grid plus a stacked-layer pair. Polyfilled on RN by injecting absolutely-positioned blend layers + `isolation: isolate`; rn-web parses natively.',
    feature: 'background-blend-mode',
    category: 'Visual effects',
    Widget: BackgroundBlendStudio,
  },
  {
    slug: 'grid-layout-board',
    title: 'Flex columns',
    summary:
      '`flex-direction: row` + `flex-wrap` + per-cell `width` %. RN 0.85 has no `display: grid`; this is the closest reliable substitute.',
    feature: 'flex-wrap + width %',
    category: 'Layout',
    Widget: GridLayoutBoard,
  },
  {
    slug: 'logical-spacing-dial',
    title: 'Logical spacing',
    summary: '`margin-inline` / `margin-block` / `padding-inline` / `inset-inline` shorthands.',
    feature: 'margin-inline',
    category: 'Layout',
    Widget: LogicalSpacingDial,
  },
  {
    slug: 'direction-board',
    title: 'Direction',
    summary:
      '`direction: ltr | rtl` drives logical inline edges. `display: contents` and `position: static` ride along as passthrough locks.',
    feature: 'direction',
    category: 'Layout',
    Widget: DirectionBoard,
  },
  {
    slug: 'place-shelf',
    title: 'Place items / self',
    summary:
      '`place-items` and `place-self` shorthands expand to the spec longhand pair. On native only the cross-axis half lands; rn-web honors both.',
    feature: 'place-items / place-self',
    category: 'Layout',
    Widget: PlaceShelf,
  },
  {
    slug: 'aspect-ratio-gallery',
    title: 'Aspect-ratio gallery',
    summary: 'Tile grid switches between portrait, square, landscape as the window ratio changes.',
    feature: '@media (aspect-ratio)',
    category: 'Layout',
    Widget: AspectRatioGallery,
  },
  {
    slug: 'container-query-card',
    title: 'Container query card',
    summary: 'Layout reflows when the card crosses 320px wide. `:hover` (web) raises elevation.',
    feature: '@container',
    category: 'Layout',
    Widget: ContainerQueryCard,
  },
  {
    slug: 'container-units-knob',
    title: 'Container-units knob',
    summary: 'Drag the handle. Type size scales with the container, not the viewport.',
    feature: 'cqw / cqh',
    category: 'Math & units',
    Widget: ContainerUnitsKnob,
  },
  {
    slug: 'viewport-units-ribbon',
    title: 'Viewport units',
    summary:
      '`vh`, `vw`, `dvh`, `svh`, `lvh`, `vmin`, `vmax`. On rn-web they flex with the visual viewport; on iOS / Android the four height variants collapse to one value.',
    feature: 'vh / dvh / svh / lvh',
    category: 'Math & units',
    Widget: ViewportUnitsRibbon,
  },
  {
    slug: 'relative-units-scale',
    title: 'rem ladder',
    summary:
      '`rem` resolves against `ResolveEnv.rootFontSize` (default 16) on native; rn-web hands it to the browser. Each dark bar should match its muted px reference exactly.',
    feature: 'rem',
    category: 'Math & units',
    Widget: RelativeUnitsScale,
  },
  {
    slug: 'math-functions-lab',
    title: 'Math functions',
    summary:
      '`calc()`, `min()`, `max()`, `clamp()`. Static arms fold at compile; viewport arms resolve per render.',
    feature: 'calc / min / max / clamp',
    category: 'Math & units',
    Widget: MathFunctionsLab,
  },
  {
    slug: 'type-features-shelf',
    title: 'Typography features',
    summary: 'Tabular nums, `line-clamp`, `letter-spacing`, themed `text-decoration`.',
    feature: 'font-variant / line-clamp',
    category: 'Typography',
    Widget: TypeFeaturesShelf,
  },
  {
    slug: 'text-wrap-shelf',
    title: 'Text wrap',
    summary:
      'Five line-breaking strategies side by side. `wrap` / `nowrap` are universal; `balance` / `pretty` lean on Android `textBreakStrategy`; `stable` is web-only.',
    feature: 'text-wrap',
    category: 'Typography',
    Widget: TextWrapShelf,
  },
  {
    slug: 'text-decoration-alignment',
    title: 'Decoration vs vertical alignment',
    summary:
      'Tall `<Text>` boxes with `textAlignVertical` `top` / `center` / `bottom`. The magenta underline must track the glyphs vertically — drift on Android exposes a missing gravity offset in the decoration draw.',
    feature: 'textDecoration + textAlignVertical',
    category: 'Typography',
    Widget: TextDecorationAlignment,
  },
  {
    slug: 'field-sizing-board',
    title: 'Field sizing · autosize',
    summary:
      "`field-sizing: content` makes a `TextInput` grow with its content per CSS Forms 1 §7.1. The polyfill lifts `multiline={true}` so React Native's own measure callback handles autosize; explicit `multiline={false}` keeps the fixed height with a dev warning. rn-web hands the declaration to the browser.",
    feature: 'field-sizing: content',
    category: 'Typography',
    Widget: FieldSizingBoard,
  },
  {
    slug: 'text-input-alignment',
    title: 'TextInput vertical alignment',
    summary:
      'Tall multiline `TextInput` fields with `vertical-align` `top` / `middle` / `bottom`. On Android and rn-web the caret and placeholder should sit at the requested position before any text is typed, and follow the content once the user starts typing. iOS has no `textAlignVertical` API for TextInput in RN 0.85 and the declaration has no effect.',
    feature: 'TextInput + textAlignVertical',
    category: 'Typography',
    Widget: TextInputAlignment,
  },
  {
    slug: 'safe-area-insets-badge',
    title: 'Safe-area insets badge',
    summary:
      'Pinned via `env(safe-area-inset-*)`. Inset readout is measured from the laid-out padding on the card so it matches what that rule applied.',
    feature: 'env()',
    category: 'Responsive environment',
    Widget: SafeAreaInsetsBadge,
  },
  {
    slug: 'media-range-bars',
    title: 'Media range bars',
    summary: 'L4 range syntax: `(width >= 400px)`, `(400px <= width <= 800px)`. Resize to see.',
    feature: '@media (range)',
    category: 'Responsive environment',
    Widget: MediaRangeBars,
  },
  {
    slug: 'reduced-motion-beacon',
    title: 'Reduced motion',
    summary:
      'Pulse runs only when `prefers-reduced-motion` is off. Honors the OS accessibility setting.',
    feature: 'prefers-reduced-motion',
    category: 'Responsive environment',
    Widget: ReducedMotionBeacon,
  },
  {
    slug: 'interactivity-board',
    title: 'Interactivity',
    summary:
      '`interactivity: inert` lifts pointer, accessibility, and focus props per CSS UI 4 §5.7. Tap-blocking + screen-reader skip + D-pad focus all gated by a single declaration.',
    feature: 'interactivity',
    category: 'Selectors & state',
    Widget: InteractivityBoard,
  },
  {
    slug: 'press-interactive',
    title: 'Press states',
    summary: '`:hover`, `:focus`, `:active`, `:disabled` — wired through one selector chain.',
    feature: ':hover / :active / :disabled',
    category: 'Selectors & state',
    Widget: PressInteractive,
  },
  {
    slug: 'attribute-variants',
    title: 'Attribute variants',
    summary: 'Styles drive entirely off `[aria-pressed]` and `[data-variant]`. No JS branching.',
    feature: '[attr]',
    category: 'Selectors & state',
    Widget: AttributeVariants,
  },
  {
    slug: 'composite-rules',
    title: 'Composite rules',
    summary:
      'Pseudo-state nested inside `@media` — gate is breakpoint AND `:active` together. Compound `&[attr]:active` works inside `@media` too.',
    feature: '@media + :state',
    category: 'Selectors & state',
    Widget: CompositeRules,
  },
  {
    slug: 'selector-combo-board',
    title: 'Combinator selectors',
    summary:
      '`${Card} &` (descendant) and `${Card} > &` (child) — independent probes light up in their own color when their rule fires. A styled wrapper between Card and probe intercepts the child rule.',
    feature: '${Component} & / >',
    category: 'Selectors & state',
    Widget: SelectorComboBoard,
  },
  {
    slug: 'sibling-nth-board',
    title: 'Sibling + :nth-child selectors',
    summary:
      'Adjacent and general sibling combinators (`${Marker} + &`, `${Marker} ~ &`) plus the full `:nth-child` family (`:first`, `:last`, `:nth-child(odd)`, `:nth-of-type(N)`). Matched probes fill the accent color and grow tall.',
    feature: '+ / ~ / :nth-child',
    category: 'Selectors & state',
    Widget: SiblingNthBoard,
  },
  {
    slug: 'has-selector-board',
    title: ':has() selector',
    summary:
      'Card reads its own descendant subtree at render time. `&:has(${Icon})` matches when an Icon is anywhere inside; `&:has([data-state="active"])` matches on prop. Recursive walk finds deep descendants.',
    feature: ':has(simple)',
    category: 'Selectors & state',
    Widget: HasSelectorBoard,
  },
  {
    slug: 'theme-overrides',
    title: 'Scoped theme overrides',
    summary:
      'Same `Swatch` component, three `ThemeProvider` contexts. The CSS reads `${theme.colors.accent}`; each subtree resolves it differently because the override deep-merges into the parent theme.',
    feature: 'createTheme + ThemeProvider',
    category: 'Theming',
    Widget: ThemeOverrides,
  },
];

export function getFidget(slug: string): FidgetEntry | undefined {
  return fidgets.find(f => f.slug === slug);
}

const CATEGORY_ORDER: FidgetCategory[] = [
  'Color',
  'Visual effects',
  'Animation',
  'Layout',
  'Math & units',
  'Typography',
  'Responsive environment',
  'Selectors & state',
  'Theming',
];

export function fidgetsByCategory(): Array<{ category: FidgetCategory; entries: FidgetEntry[] }> {
  const groups = new Map<FidgetCategory, FidgetEntry[]>();
  for (const f of fidgets) {
    const list = groups.get(f.category);
    if (list) list.push(f);
    else groups.set(f.category, [f]);
  }
  return CATEGORY_ORDER.filter(c => groups.has(c)).map(category => ({
    category,
    entries: groups.get(category)!,
  }));
}
