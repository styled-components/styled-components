import createStyledComponent from '../models/StyledComponent';
import { WebTarget } from '../types';
import domElements from '../utils/domElements';
import constructWithOptions, { Construct } from './constructWithOptions';

const baseStyled = <Target extends WebTarget>(tag: Target) =>
  constructWithOptions<Target>(createStyledComponent, tag);

const enhancedStyled = baseStyled as typeof baseStyled & {
  [E in keyof JSX.IntrinsicElements]: ReturnType<
    <Props = {}, Statics = {}>() => ReturnType<
      Construct<E, React.ComponentProps<E> & Props, Statics>
    >
  >;
};

// Shorthands for all valid HTML Elements
domElements.forEach(domElement => {
  enhancedStyled[domElement] = baseStyled(domElement);
});

export default enhancedStyled;
