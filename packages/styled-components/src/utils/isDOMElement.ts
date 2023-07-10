import domElements from './domElements';

/**
 * Check if `element` is a DOM element.
 */
export default function (element: any): element is HTMLElement {
  return typeof element === 'string' && domElements.has(element as any);
}
