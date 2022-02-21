import createStyledComponent from '../models/StyledComponent';
import { WebTarget } from '../types';
import domElements from '../utils/domElements';
import constructWithOptions, { WebConstruct } from './constructWithOptions';

const baseStyled = <Target extends WebTarget>(tag: Target) =>
  constructWithOptions<'web', Target>(createStyledComponent, tag);

const styled = baseStyled as typeof baseStyled & {
  [E in keyof JSX.IntrinsicElements]: ReturnType<
    <Props = {}, Statics = {}>() => ReturnType<
      WebConstruct<E, React.ComponentProps<E> & Props, Statics>
    >
  >;
};

// Shorthands for all valid HTML Elements
domElements.forEach(domElement => {
  styled[domElement] = baseStyled(domElement);
});

export default styled;
