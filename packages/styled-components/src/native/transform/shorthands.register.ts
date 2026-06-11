import {
  animationDelayLonghand,
  animationDirectionLonghand,
  animationDurationLonghand,
  animationCompositionLonghand,
  animationFillModeLonghand,
  animationIterationCountLonghand,
  animationNameLonghand,
  animationPlayStateLonghand,
  animationRangeEndLonghand,
  animationRangeShorthand,
  animationRangeStartLonghand,
  animationShorthand,
  animationTimelineLonghand,
  animationTimingFunctionLonghand,
  scrollTimelineAxisLonghand,
  scrollTimelineNameLonghand,
  scrollTimelineShorthand,
  transitionBehaviorLonghand,
  transitionDelayLonghand,
  transitionDurationLonghand,
  transitionPropertyLonghand,
  transitionShorthand,
  transitionTimingFunctionLonghand,
} from '../animation/parse-shorthand';
import {
  backgroundAttachmentLonghand,
  backgroundClipLonghand,
  backgroundOriginLonghand,
  backgroundShorthand,
} from './handlers/background';
import {
  borderColorShorthand,
  borderShorthand,
  borderStyleShorthand,
  outlineShorthand,
} from './handlers/border';
import {
  aspectRatioShorthand,
  fontFamilyShorthand,
  fontShorthand,
  fontSizeHandler,
  fontStyleHandler,
  fontVariantShorthand,
  letterSpacingHandler,
  lineHeightHandler,
} from './handlers/font';
import {
  flexFlowShorthand,
  flexShorthand,
  placeContentShorthand,
  placeItemsShorthand,
  placeSelfShorthand,
} from './handlers/flex';
import {
  borderRadiusShorthand,
  borderWidthShorthand,
  gapShorthand,
  marginShorthand,
  paddingShorthand,
} from './handlers/spacing';
import {
  shadowOffsetShorthand,
  textAlignHandler,
  textDecorationLineShorthand,
  textDecorationShorthand,
  textDecorationThicknessHandler,
  textShadowOffsetShorthand,
  textShadowShorthand,
  textUnderlineOffsetHandler,
  textUnderlinePositionHandler,
} from './handlers/text';
import { register } from './shorthands';

register('margin', marginShorthand);
register('padding', paddingShorthand);
register('gap', gapShorthand);
register('borderWidth', borderWidthShorthand);
register('borderRadius', borderRadiusShorthand);
register('borderColor', borderColorShorthand);
register('borderStyle', borderStyleShorthand);
register('border', borderShorthand);
register('outline', outlineShorthand);
register('flex', flexShorthand);
register('flexFlow', flexFlowShorthand);
register('placeContent', placeContentShorthand);
register('placeItems', placeItemsShorthand);
register('placeSelf', placeSelfShorthand);
register('font', fontShorthand);
register('fontFamily', fontFamilyShorthand);
register('fontSize', fontSizeHandler);
register('fontStyle', fontStyleHandler);
register('fontVariant', fontVariantShorthand);
register('lineHeight', lineHeightHandler);
register('letterSpacing', letterSpacingHandler);
register('aspectRatio', aspectRatioShorthand);
register('textAlign', textAlignHandler);
register('textDecoration', textDecorationShorthand);
register('textDecorationLine', textDecorationLineShorthand);
register('textDecorationThickness', textDecorationThicknessHandler);
register('textUnderlineOffset', textUnderlineOffsetHandler);
register('textUnderlinePosition', textUnderlinePositionHandler);
register('textShadow', textShadowShorthand);
register('textShadowOffset', textShadowOffsetShorthand);
register('shadowOffset', shadowOffsetShorthand);

register('background', backgroundShorthand);
register('backgroundAttachment', backgroundAttachmentLonghand);
register('backgroundOrigin', backgroundOriginLonghand);
register('backgroundClip', backgroundClipLonghand);

register('animation', animationShorthand);
register('animationName', animationNameLonghand);
register('animationDuration', animationDurationLonghand);
register('animationTimingFunction', animationTimingFunctionLonghand);
register('animationDelay', animationDelayLonghand);
register('animationIterationCount', animationIterationCountLonghand);
register('animationDirection', animationDirectionLonghand);
register('animationFillMode', animationFillModeLonghand);
register('animationPlayState', animationPlayStateLonghand);
register('animationComposition', animationCompositionLonghand);
register('animationRange', animationRangeShorthand);
register('animationRangeStart', animationRangeStartLonghand);
register('animationRangeEnd', animationRangeEndLonghand);
register('animationTimeline', animationTimelineLonghand);
register('scrollTimeline', scrollTimelineShorthand);
register('scrollTimelineName', scrollTimelineNameLonghand);
register('scrollTimelineAxis', scrollTimelineAxisLonghand);
register('transition', transitionShorthand);
register('transitionProperty', transitionPropertyLonghand);
register('transitionDuration', transitionDurationLonghand);
register('transitionTimingFunction', transitionTimingFunctionLonghand);
register('transitionDelay', transitionDelayLonghand);
register('transitionBehavior', transitionBehaviorLonghand);

// Side-effect imports register polyfill handlers.
import './polyfills/logicalShorthand';
import './polyfills/logicalBorder';
import './polyfills/interactivity';
import './polyfills/accentColor';
import './polyfills/lineClamp';
import './polyfills/scroll';
import './polyfills/textOverflow';
import './polyfills/textWrap';
import './polyfills/hyphens';
import './polyfills/caretColor';
import './polyfills/standaloneTransform';
import './polyfills/fieldSizing';
import './polyfills/cornerShape';
import './polyfills/grid';
