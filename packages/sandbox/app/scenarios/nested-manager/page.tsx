import styled, { StyleSheetManager } from 'styled-components';
import { BLUE, Scenario } from '../ui';
import { ClientManagerProbe } from './client';

const ServerProbe = styled.div`
  color: blue;
`;

export default function Page() {
  return (
    <Scenario
      rows="S23"
      title="Server and client components under a nested manager with a nonce or a target"
      expected="each element styled with JavaScript off; the client subtree re-inserts into its target after hydration"
    >
      <StyleSheetManager nonce="sandbox-nonce">
        <ServerProbe data-testid="probe-server" data-expected={BLUE}>
          server component under a manager with a nonce
        </ServerProbe>
      </StyleSheetManager>
      <ClientManagerProbe />
    </Scenario>
  );
}
