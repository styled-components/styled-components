import { ComponentType } from 'react';
import { AspectRatioGallery } from './AspectRatioGallery';
import { AttributeVariants } from './AttributeVariants';
import { BackgroundBlendStudio } from './BackgroundBlendStudio';
import { BlendModeBoard } from './BlendModeBoard';
import { ColorFunctionsLab } from './ColorFunctionsLab';
import { CompositeRules } from './CompositeRules';
import { ContainerQueryCard } from './ContainerQueryCard';
import { ContainerUnitsKnob } from './ContainerUnitsKnob';
import { FilterStack } from './FilterStack';
import { GradientPalette } from './GradientPalette';
import { GridLayoutBoard } from './GridLayoutBoard';
import { KeyframeOrchestra } from './KeyframeOrchestra';
import { LightDarkSwatch } from './LightDarkSwatch';
import { LogicalSpacingDial } from './LogicalSpacingDial';
import { MathFunctionsLab } from './MathFunctionsLab';
import { MediaRangeBars } from './MediaRangeBars';
import { PressInteractive } from './PressInteractive';
import { ReducedMotionBeacon } from './ReducedMotionBeacon';
import { SafeAreaInsetsBadge } from './SafeAreaInsetsBadge';
import { ShadowComposer } from './ShadowComposer';
import { StandaloneTransforms } from './StandaloneTransforms';
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
      'Five line-breaking strategies, with per-row platform support chips. `wrap` / `nowrap` are universal; `balance` / `pretty` need Android `textBreakStrategy`; `stable` is web-only.',
    feature: 'text-wrap',
    category: 'Typography',
    Widget: TextWrapShelf,
  },
  {
    slug: 'safe-area-insets-badge',
    title: 'Safe-area insets badge',
    summary: 'Pinned via `env(safe-area-inset-*)`. Notch on iOS, `env()` on web.',
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
