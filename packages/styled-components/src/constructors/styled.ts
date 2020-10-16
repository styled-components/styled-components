import constructWithOptions from './constructWithOptions';
import StyledComponent from '../models/StyledComponent';
import domElements from '../utils/domElements';

import { Target } from '../types';

type StyledTemplateFunction = ReturnType<typeof constructWithOptions>;

type ElementShortcuts = {
  [key in keyof JSX.IntrinsicElements]?: StyledTemplateFunction;
};

interface Styled extends ElementShortcuts {
  (tag: Target): StyledTemplateFunction;
}

const styled: Styled = (tag: Target) => constructWithOptions(StyledComponent, tag);

// Shorthands for all valid HTML Elements
domElements.forEach(domElement => {
  styled[domElement] = styled(domElement);
});

export default styled;
