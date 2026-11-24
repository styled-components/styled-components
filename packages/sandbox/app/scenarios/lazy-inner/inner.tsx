'use client';

import styled from 'styled-components';

/** Loaded only when the page asks for it, so its definition runs long after the page's own. */
const LazyInner = styled.div`
  color: red;
`;

export default LazyInner;
