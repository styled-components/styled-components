import createStyledComponent from '../models/StyledComponent';
import { WebTarget } from '../types';
import domElements, { SupportedHTMLElements } from '../utils/domElements';
import constructWithOptions, { Styled } from './constructWithOptions';

const baseStyled = <Target extends WebTarget>(tag: Target) =>
  constructWithOptions<'web', Target>(createStyledComponent, tag);

const styled = baseStyled as typeof baseStyled & {
  [E in SupportedHTMLElements]: Styled<'web', E, JSX.IntrinsicElements[E]>;
};

// Shorthands for all valid HTML Elements
domElements.forEach(domElement => {
  // @ts-expect-error some react typing bs
  styled[domElement] = baseStyled<typeof domElement>(domElement);
});

export default styled;
