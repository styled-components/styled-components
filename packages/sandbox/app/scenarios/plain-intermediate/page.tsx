import type { ComponentProps } from 'react';
import styled from 'styled-components';
import { ClientBase } from '../client-base';
import { BLUE, Scenario } from '../ui';

/** Every prop passes through, so the probe's `data-expected` reaches the element. */
type PlainProps = ComponentProps<'div'>;

const A = styled.div`
  color: red;
`;

function PlainServer(props: PlainProps) {
  return <A {...props} />;
}

function PlainClient(props: PlainProps) {
  return <ClientBase {...props} />;
}

// Each outer is defined after the component it reaches through a plain function.
const BServer = styled(PlainServer)`
  color: blue;
`;

const BClient = styled(PlainClient)`
  color: blue;
`;

export default function Page() {
  return (
    <Scenario
      rows="S4"
      title="Server B extends a plain function that renders a server or client inner"
      expected="blue on both"
    >
      <BServer data-testid="probe-server" data-expected={BLUE}>
        server inner
      </BServer>
      <BClient data-testid="probe-client" data-expected={BLUE}>
        client inner
      </BClient>
    </Scenario>
  );
}
