import * as secondary from './base';
/* Import singleton constructors */
import styled from './constructors/styled';

/**
 * Eliminates the need to do `styled.default`; the secondary APIs are
 * attached as own-properties on the main `styled` function so consumers
 * can `import styled from 'styled-components'; styled.css; styled.keyframes`
 * etc.
 */
Object.assign(styled, secondary);

export default styled;
export { styled };
