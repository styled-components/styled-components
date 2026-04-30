import { ComponentType } from 'react';
import type { VerificationCase } from '@/components/WidgetCase';
import { AspectRatioGallery } from './AspectRatioGallery';
import { AttributeVariants, attributeVariantsCases } from './AttributeVariants';
import { BlendModeBoard } from './BlendModeBoard';
import { ColorSpacesGallery } from './ColorSpacesGallery';
import { CompositeRules } from './CompositeRules';
import { ContainerQueryCard } from './ContainerQueryCard';
import { ContainerUnitsKnob } from './ContainerUnitsKnob';
import { FilterStack } from './FilterStack';
import { GradientPalette } from './GradientPalette';
import { GridLayoutBoard } from './GridLayoutBoard';
import { LightDarkSwatch } from './LightDarkSwatch';
import { LogicalSpacingDial } from './LogicalSpacingDial';
import { MathFunctionsLab } from './MathFunctionsLab';
import { MediaRangeBars } from './MediaRangeBars';
import { PressInteractive } from './PressInteractive';
import { ReducedMotionBeacon } from './ReducedMotionBeacon';
import { SafeAreaInsetsBadge } from './SafeAreaInsetsBadge';
import { ShadowComposer } from './ShadowComposer';
import { ThemeSentinelGrid } from './ThemeSentinelGrid';
import { TransformPlayground } from './TransformPlayground';
import { TypeFeaturesShelf } from './TypeFeaturesShelf';
import { ViewportUnitsHero } from './ViewportUnitsHero';

export type FidgetCategory =
  | 'Color'
  | 'Visual effects'
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
  cases?: VerificationCase[];
}

export const fidgets: ReadonlyArray<FidgetEntry> = [
  {
    slug: 'color-spaces-gallery',
    title: 'oklch palette',
    summary: 'Four-hue tonal palette in oklch, compiled to sRGB at transform time. Plus color-mix interpolation comparison across srgb / oklab / oklch.',
    feature: 'oklch / color-mix',
    category: 'Color',
    Widget: ColorSpacesGallery,
  },
  {
    slug: 'light-dark-swatch',
    title: 'Light-dark swatch',
    summary: 'Two swatches: one uses light-dark(), one uses prefers-color-scheme media query.',
    feature: 'light-dark()',
    category: 'Color',
    Widget: LightDarkSwatch,
  },
  {
    slug: 'gradient-palette',
    title: 'Gradients',
    summary: 'Linear, radial, layered. Theme sentinels stitch in at render via templateResolver.',
    feature: 'linear/radial-gradient',
    category: 'Visual effects',
    Widget: GradientPalette,
  },
  {
    slug: 'filter-stack',
    title: 'Filters',
    summary: 'Blur, saturate, hue-rotate, drop-shadow. Pass-through to RN 0.83+ string parser.',
    feature: 'filter',
    category: 'Visual effects',
    Widget: FilterStack,
  },
  {
    slug: 'shadow-composer',
    title: 'Box shadows',
    summary: 'Soft, layered, inset, spread, theme-colored. RN 0.84+ supports inset and spread.',
    feature: 'box-shadow',
    category: 'Visual effects',
    Widget: ShadowComposer,
  },
  {
    slug: 'transform-playground',
    title: 'Transforms',
    summary: 'Translate, rotate + scale, skew. Theme sentinels stitched into the value at render.',
    feature: 'transform',
    category: 'Visual effects',
    Widget: TransformPlayground,
  },
  {
    slug: 'blend-mode-board',
    title: 'Blend modes',
    summary: 'mix-blend-mode + isolation create a composited stacking context. RN 0.85+.',
    feature: 'mix-blend-mode',
    category: 'Visual effects',
    Widget: BlendModeBoard,
  },
  {
    slug: 'grid-layout-board',
    title: 'Flex columns',
    summary: 'flex-direction: row + flex-wrap + per-cell flex-basis. RN 0.85 has no display: grid.',
    feature: 'flex-wrap + flex-basis',
    category: 'Layout',
    Widget: GridLayoutBoard,
  },
  {
    slug: 'logical-spacing-dial',
    title: 'Logical spacing',
    summary: 'margin-inline / margin-block / padding-inline / inset-inline shorthands.',
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
    summary: 'Layout reflows when the card crosses 320px wide. Hover (web) raises elevation.',
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
    slug: 'viewport-units-hero',
    title: 'Viewport units hero',
    summary: 'Three panels sized in dvh / svh / lvh. Diverge on iOS Safari as URL bar collapses.',
    feature: 'vh / dvh / svh / lvh',
    category: 'Math & units',
    Widget: ViewportUnitsHero,
  },
  {
    slug: 'math-functions-lab',
    title: 'Math functions',
    summary: 'calc, min, max, clamp. Static arms fold at compile; viewport arms resolve per render.',
    feature: 'calc / min / max / clamp',
    category: 'Math & units',
    Widget: MathFunctionsLab,
  },
  {
    slug: 'type-features-shelf',
    title: 'Typography features',
    summary: 'Tabular nums, line-clamp, letter-spacing, themed text-decoration.',
    feature: 'font-variant / line-clamp',
    category: 'Typography',
    Widget: TypeFeaturesShelf,
  },
  {
    slug: 'safe-area-insets-badge',
    title: 'Safe-area insets badge',
    summary: 'Pinned via env(safe-area-inset-*). Notch on iOS, env() on web.',
    feature: 'env()',
    category: 'Responsive environment',
    Widget: SafeAreaInsetsBadge,
  },
  {
    slug: 'media-range-bars',
    title: 'Media range bars',
    summary: 'L4 range syntax: (width >= 400px), (400px <= width <= 800px). Resize to see.',
    feature: '@media (range)',
    category: 'Responsive environment',
    Widget: MediaRangeBars,
  },
  {
    slug: 'reduced-motion-beacon',
    title: 'Reduced motion',
    summary: 'Pulse runs only when reduce-motion is off. Honors OS accessibility setting.',
    feature: 'prefers-reduced-motion',
    category: 'Responsive environment',
    Widget: ReducedMotionBeacon,
  },
  {
    slug: 'press-interactive',
    title: 'Press states',
    summary: 'hover, focus, active, disabled — wired through one selector chain.',
    feature: ':hover / :active / :disabled',
    category: 'Selectors & state',
    Widget: PressInteractive,
  },
  {
    slug: 'attribute-variants',
    title: 'Attribute variants',
    summary: 'Styles drive entirely off [aria-pressed] and [data-variant]. No JS branching.',
    feature: '[attr]',
    category: 'Selectors & state',
    Widget: AttributeVariants,
    cases: attributeVariantsCases,
  },
  {
    slug: 'composite-rules',
    title: 'Composite rules',
    summary: 'Pseudo-state nested inside @media — gate is breakpoint AND :active together.',
    feature: '@media + :state',
    category: 'Selectors & state',
    Widget: CompositeRules,
  },
  {
    slug: 'theme-sentinel-grid',
    title: 'Theme sentinel grid',
    summary: 'Nested ThemeProvider deep-merges to override one cell. createTheme native parity.',
    feature: 'createTheme',
    category: 'Theming',
    Widget: ThemeSentinelGrid,
  },
];

export function getFidget(slug: string): FidgetEntry | undefined {
  return fidgets.find(f => f.slug === slug);
}

const CATEGORY_ORDER: FidgetCategory[] = [
  'Color',
  'Visual effects',
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
