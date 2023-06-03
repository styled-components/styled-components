import createStyledComponent from '../models/StyledComponent';
import {
  AnyStyledComponent,
  StyledComponentInnerAttrs,
  StyledComponentInnerComponent,
  StyledComponentInnerOtherProps,
  WebTarget,
} from '../types';
import domElements from '../utils/domElements';
import constructWithOptions, { Styled } from './constructWithOptions';

function createStyle<Target extends AnyStyledComponent<'web'>>(
  tag: Target
): Styled<
  'web',
  StyledComponentInnerComponent<'web', Target>,
  StyledComponentInnerOtherProps<'web', Target>,
  StyledComponentInnerAttrs<'web', Target>
>;
function createStyle<Target extends WebTarget>(tag: Target): Styled<'web', Target, {}>;
function createStyle<Target extends WebTarget>(tag: Target) {
  return constructWithOptions<'web', Target>(createStyledComponent, tag);
}

type WebStyledStatic = typeof createStyle & {
  [E in keyof JSX.IntrinsicElements]: Styled<'web', E, {}>;
};

const styled = createStyle as WebStyledStatic;

domElements.forEach(domElement => {
  // Using any because TS blows CPU up here for some reason
  (styled as any)[domElement] = createStyle(domElement);
});

export default styled;
