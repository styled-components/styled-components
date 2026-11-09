'use client';

import styled, { StyleSheetManager } from 'styled-components';
import { GREEN } from '../ui';

const ClientProbe = styled.div`
  color: green;
`;

/** A client manager with a nonce and a target; its subtree still styles during server rendering. */
export function ClientManagerProbe() {
  return (
    <StyleSheetManager
      nonce="sandbox-nonce"
      target={typeof document === 'undefined' ? undefined : document.head}
    >
      <ClientProbe data-testid="probe-client" data-expected={GREEN}>
        client component under a manager with a nonce and a target
      </ClientProbe>
    </StyleSheetManager>
  );
}
