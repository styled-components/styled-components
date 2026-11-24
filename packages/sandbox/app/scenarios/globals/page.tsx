import styled, { createGlobalStyle } from 'styled-components';
import { BLUE, RED, Scenario } from '../ui';
import { ClientGlobal, ClientTie } from './client';

// The component is defined before the global, so definition order alone would put it first.
const ServerTie = styled.div`
  color: blue;
`;

const ServerGlobal = createGlobalStyle`
  .tie-sg-sc,
  .tie-sg-cc {
    color: red;
  }

  .tie-sg-cg {
    color: green;
  }
`;

export default function Page() {
  return (
    <Scenario
      rows="S13, S25"
      title="Globals against components on one element, server and client"
      expected="a component beats every global; a client global beats a server global"
    >
      <ServerGlobal />
      <ClientGlobal />
      <ServerTie
        className="tie-sg-sc"
        data-testid="server-global-server-component"
        data-expected={BLUE}
      >
        server global, server component
      </ServerTie>
      <ClientTie
        className="tie-sg-cc"
        data-testid="server-global-client-component"
        data-expected={BLUE}
      >
        server global, client component
      </ClientTie>
      <ServerTie
        className="tie-cg-sc"
        data-testid="client-global-server-component"
        data-expected={BLUE}
      >
        client global, server component
      </ServerTie>
      <ClientTie
        className="tie-cg-cc"
        data-testid="client-global-client-component"
        data-expected={BLUE}
      >
        client global, client component
      </ClientTie>
      <div className="tie-sg-cg" data-testid="client-global-server-global" data-expected={RED}>
        server global (green) against client global (red)
      </div>
    </Scenario>
  );
}
