import createStyledComponent from '../models/StyledComponent';
import { DefaultTheme, WebTarget } from '../types';
import domElements from '../utils/domElements';
import constructWithOptions, { Styled } from './constructWithOptions';

const baseStyled = <Target extends WebTarget>(tag: Target) =>
  constructWithOptions<'web', DefaultTheme, Target>(createStyledComponent, tag);

const styled = baseStyled as typeof baseStyled & {
  [E in keyof JSX.IntrinsicElements]: Styled<'web', DefaultTheme, E, JSX.IntrinsicElements[E]>;
};

// Shorthands for all valid HTML Elements
domElements.forEach(domElement => {
  styled[domElement] = baseStyled<typeof domElement>(domElement);
});

export default styled;
