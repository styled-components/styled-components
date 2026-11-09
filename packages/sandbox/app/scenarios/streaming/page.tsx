import { Suspense } from 'react';
import { createGlobalStyle } from 'styled-components';
import { BLUE, delay, GREEN, PURPLE, Scenario } from '../ui';
import { LateClientGlobal, LateWidgetOne, LateWidgetThree, LateWidgetTwo } from './client';

export const dynamic = 'force-dynamic';

/** First rendered by a late boundary, so it is a server global that arrives after a flush. */
const LateServerGlobal = createGlobalStyle`
  [data-late-server-global] {
    outline: 2px solid rgb(0, 128, 0);
  }
`;

async function LateOne() {
  await delay(600);

  return (
    <LateWidgetOne data-testid="late-1" data-expected={BLUE}>
      late boundary 1: client component
    </LateWidgetOne>
  );
}

async function LateTwo() {
  await delay(1200);

  return (
    <LateWidgetTwo data-testid="late-2" data-expected={GREEN}>
      late boundary 2: client component
    </LateWidgetTwo>
  );
}

async function LateThree() {
  await delay(1800);

  return (
    <LateWidgetThree data-testid="late-3" data-expected={PURPLE}>
      late boundary 3: client component
    </LateWidgetThree>
  );
}

async function LateServerGlobalBoundary() {
  await delay(2400);

  return (
    <>
      <LateServerGlobal />
      <p
        data-late-server-global
        data-testid="late-server-global"
        data-expected={GREEN}
        data-expected-property="outline-color"
      >
        late boundary 4: first render of a server global
      </p>
    </>
  );
}

async function LateClientGlobalBoundary() {
  await delay(3000);

  return (
    <>
      <LateClientGlobal />
      <p
        data-late-client-global
        data-testid="late-client-global"
        data-expected={PURPLE}
        data-expected-property="outline-color"
      >
        late boundary 5: first render of a client global
      </p>
    </>
  );
}

export default function Page() {
  return (
    <div data-streaming-page>
      <Scenario
        rows="cost: streaming, S8c, S26"
        title="A server global in the layout, three late client boundaries, then a late server global and a late client global"
        expected="every element styled once its boundary reveals; measure total HTML bytes and the bytes each late boundary re-emits"
      >
        <Suspense fallback={<p>loading 1</p>}>
          <LateOne />
        </Suspense>
        <Suspense fallback={<p>loading 2</p>}>
          <LateTwo />
        </Suspense>
        <Suspense fallback={<p>loading 3</p>}>
          <LateThree />
        </Suspense>
        <Suspense fallback={<p>loading 4</p>}>
          <LateServerGlobalBoundary />
        </Suspense>
        <Suspense fallback={<p>loading 5</p>}>
          <LateClientGlobalBoundary />
        </Suspense>
      </Scenario>
    </div>
  );
}
