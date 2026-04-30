import { borderColorShorthand, borderShorthand, borderStyleShorthand } from './handlers/border';
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
register('borderWidth', borderWidthShorthand);
register('borderRadius', borderRadiusShorthand);
register('borderColor', borderColorShorthand);
register('borderStyle', borderStyleShorthand);
register('border', borderShorthand);
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

// Side-effect imports register polyfill handlers.
import './polyfills/logicalShorthand';
import './polyfills/lineClamp';
