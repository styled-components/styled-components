import createStyledComponent from '../models/StyledComponent';
import { WebTarget } from '../types';
import domElements from '../utils/domElements';
import constructWithOptions, { WebStyled } from './constructWithOptions';

const baseStyled = <Target extends WebTarget>(tag: Target) =>
  constructWithOptions<'web', Target>(createStyledComponent, tag);

const styled = baseStyled as typeof baseStyled & {
  [E in keyof JSX.IntrinsicElements]: WebStyled<E, JSX.IntrinsicElements[E]>;
};

// Shorthands for all valid HTML Elements
domElements.forEach(domElement => {
  // @ts-expect-error someday they'll handle imperative assignment properly
  styled[domElement] = baseStyled(domElement);
});

export default styled;
