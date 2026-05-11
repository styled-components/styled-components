import {
  animationDelayLonghand,
  animationDirectionLonghand,
  animationDurationLonghand,
  animationFillModeLonghand,
  animationIterationCountLonghand,
  animationNameLonghand,
  animationPlayStateLonghand,
  animationShorthand,
  animationTimingFunctionLonghand,
  transitionBehaviorLonghand,
  transitionDelayLonghand,
  transitionDurationLonghand,
  transitionPropertyLonghand,
  transitionShorthand,
  transitionTimingFunctionLonghand,
} from '../animation/parse-shorthand';
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
  fontVariantShorthand,
} from './handlers/font';
import { flexFlowShorthand, flexShorthand, placeContentShorthand } from './handlers/flex';
import {
  borderRadiusShorthand,
  borderWidthShorthand,
  gapShorthand,
  marginShorthand,
  paddingShorthand,
} from './handlers/spacing';
import {
  shadowOffsetShorthand,
  textDecorationLineShorthand,
  textDecorationShorthand,
  textShadowOffsetShorthand,
  textShadowShorthand,
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
register('font', fontShorthand);
register('fontFamily', fontFamilyShorthand);
register('fontVariant', fontVariantShorthand);
register('aspectRatio', aspectRatioShorthand);
register('textDecoration', textDecorationShorthand);
register('textDecorationLine', textDecorationLineShorthand);
register('textShadow', textShadowShorthand);
register('textShadowOffset', textShadowOffsetShorthand);
register('shadowOffset', shadowOffsetShorthand);

register('animation', animationShorthand);
register('animationName', animationNameLonghand);
register('animationDuration', animationDurationLonghand);
register('animationTimingFunction', animationTimingFunctionLonghand);
register('animationDelay', animationDelayLonghand);
register('animationIterationCount', animationIterationCountLonghand);
register('animationDirection', animationDirectionLonghand);
register('animationFillMode', animationFillModeLonghand);
register('animationPlayState', animationPlayStateLonghand);
register('transition', transitionShorthand);
register('transitionProperty', transitionPropertyLonghand);
register('transitionDuration', transitionDurationLonghand);
register('transitionTimingFunction', transitionTimingFunctionLonghand);
register('transitionDelay', transitionDelayLonghand);
register('transitionBehavior', transitionBehaviorLonghand);

// Side-effect imports register polyfill handlers.
import './polyfills/logicalShorthand';
import './polyfills/lineClamp';
import './polyfills/textWrap';
import './polyfills/hyphens';
import './polyfills/caretColor';
import './polyfills/standaloneTransform';
