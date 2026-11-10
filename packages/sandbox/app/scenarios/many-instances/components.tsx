import styled from 'styled-components';

export const COMPONENT_COUNT = 50;
export const INSTANCE_COUNT = 5000;

/** Fifty server styled components; each has its own explicit id so the build transform cannot merge them. */
export const components = Array.from(
  { length: COMPONENT_COUNT },
  (_, index) =>
    styled.span.withConfig({ componentId: `many-${index}` })`
    display: inline-block;
    padding: ${index % 5}px ${index % 7}px;
    color: hsl(${index * 7}, 70%, 40%);
  `
);
