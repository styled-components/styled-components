/**
 * @jest-environment node
 * @jest-environment-options {"customExportConditions": ["react-server", "node", "node-addons"]}
 */

// Renders with the real Flight server under the `react-server` export condition, so
// Flight's own task order (async resumption, size-deferred elements) and its
// request-scoped `React.cache` decide when each styled element renders and what it
// can see. The shim's components are client references, as a host's bundler makes
// them. See docs/react.md "Server component styles".
jest.mock('styled-components/server-styles', () =>
  jest.requireActual('../../test/flight').serverStylesAsClientReferences()
);

import React from 'react';
import { groupForId } from '../../sheet/GroupIDAllocator';
import styled from '../../index';
import {
  FILLER_PARAGRAPHS,
  Filler,
  clientComponent,
  renderFlight,
  styleProps,
  type FlightResult,
  type Probe,
} from '../../test/flight';

type PassedProps = { className?: string };

/** The classes of a probe element that are not component ids (`sc-xxxx`, or `Name-sc-xxxx` with a build plugin). */
const generatedClasses = (probe: Probe): string[] =>
  probe.className.split(' ').filter(name => !name.includes('sc-'));

describe('styled components under Flight', () => {
  it('sends the style of a wrapper that resumes after an await, and the outer it passes its classes through to', async () => {
    const Btn = styled.div`
      color: blue;
    `;
    const AsyncWrap = async (props: PassedProps) => {
      await new Promise(resolve => setTimeout(resolve, 1));

      return <Btn {...props} />;
    };
    const Red = styled(AsyncWrap)`
      color: red;
    `;

    const result = await renderFlight(
      <main>
        <Btn data-probe="base" />
        <Red data-probe="async" />
      </main>
    );
    const [, blue, , red] = result.probes.async.className.split(' ');
    const btn = [Btn.styledComponentId, blue, groupForId(Btn.styledComponentId)];
    const outer = Red.styledComponentId;

    expect(result.errors).toEqual([]);
    expect(
      styleProps(result)
        .map(({ chain, outers }) => ({
          levels: chain.map(([id, name, , seq]) => [id, name, seq]),
          outers,
        }))
        .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))
    ).toEqual(
      [
        { levels: [[outer, red, groupForId(outer)]], outers: [] },
        { levels: [btn], outers: [outer] },
        { levels: [btn], outers: [] },
      ].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))
    );
    // Each rule reaches the payload once, however many elements carry it.
    expect(result.payload.split(`.${blue}{color:blue;}`)).toHaveLength(2);
    expect(result.payload.split(`.${red}{color:red;}`)).toHaveLength(2);
  });

  it('sends the outer of a wrapper whose element Flight deferred behind a large sibling', async () => {
    const Btn = styled.div`
      color: blue;
    `;
    const Wrap = (props: PassedProps) => <Btn {...props} />;
    const Red = styled(Wrap)`
      color: crimson;
    `;

    const result = await renderFlight(
      <main>
        <Btn data-probe="base" />
        <Filler />
        <Red data-probe="deferred" />
      </main>
    );
    const outer = Red.styledComponentId;

    expect(result.errors).toEqual([]);
    expect(
      styleProps(result)
        .map(props => JSON.stringify(props.outers))
        .sort()
    ).toEqual([JSON.stringify([]), JSON.stringify([]), JSON.stringify([outer])].sort());
    // The case only means something when Flight deferred the filler's paragraphs, each into its own
    // row, so every row after them is numbered past them (rows are hex ids).
    expect(parseInt(result.probes.deferred.row, 16)).toBeGreaterThan(FILLER_PARAGRAPHS);
  });

  it('finds the outer of a wrapper that reorders the classes it passes down', async () => {
    const Btn = styled.div`
      color: blue;
    `;
    const Reorder = ({ className = '' }: PassedProps) => (
      <Btn className={className.split(' ').reverse().join(' ')} data-probe="reorder" />
    );
    const Red = styled(Reorder)`
      color: maroon;
    `;

    const result = await renderFlight(<Red />);
    const inner = styleProps(result).find(props => props.chain[0][0] === Btn.styledComponentId);

    expect(inner?.outers).toEqual([Red.styledComponentId]);
  });

  it('passes a wrapper of a client component its own id and generated class, and sends the rule for that class', async () => {
    const Link = clientComponent<PassedProps>('Link');
    const Red = styled(Link)`
      color: tomato;
    `;

    const result = await renderFlight(<Red />);
    const link = result.clientProps.find(props => 'className' in props);
    const [id, generated] = String(link?.className).split(' ');

    expect(result.errors).toEqual([]);
    expect(id).toBe(Red.styledComponentId);
    expect(styleProps(result)).toEqual([
      {
        chain: [
          [Red.styledComponentId, generated, [`.${generated}{color:tomato;}`], groupForId(id)],
        ],
        keyframes: [],
        outers: [],
      },
    ]);
  });

  it('keeps two apps with colliding component ids and different rules apart when they render at once', async () => {
    /** An app whose Btn and Red carry fixed component ids, as a build plugin gives two copies of one component. */
    const app = (innerColor: string, outerColor: string) => {
      const Btn = styled.div.withConfig({ componentId: 'Btn-sc-1a2b3c', displayName: 'Btn' })`
        color: ${innerColor};
      `;
      const AsyncWrap = async (props: PassedProps) => {
        await new Promise(resolve => setTimeout(resolve, 2));

        return <Btn {...props} />;
      };
      const Red = styled(AsyncWrap).withConfig({
        componentId: 'Red-sc-4d5e6f',
        displayName: 'Red',
      })`
        color: ${outerColor};
      `;

      return (
        <main>
          {Array.from({ length: 20 }, (_, index) => (
            <Red data-probe={`r${index}`} key={index} />
          ))}
        </main>
      );
    };

    /** Each component id with the rule of each level it carries, the generated class replaced by `X`. */
    const rulesById = (result: FlightResult): Record<string, string[]> => {
      const byId: Record<string, Set<string>> = {};

      for (const { chain } of styleProps(result)) {
        for (const [id, name, rules] of chain) {
          byId[id] ??= new Set();
          for (const rule of rules) byId[id].add(rule.replaceAll(name, 'X'));
        }
      }

      return Object.fromEntries(Object.entries(byId).map(([id, rules]) => [id, [...rules]]));
    };

    const [first, second] = await Promise.all([
      renderFlight(app('blue', 'red')),
      renderFlight(app('purple', 'green')),
    ]);

    expect(rulesById(first)).toEqual({
      'Btn-Btn-sc-1a2b3c': ['.X{color:blue;}'],
      'Red-Red-sc-4d5e6f': ['.X{color:red;}'],
    });
    expect(rulesById(second)).toEqual({
      'Btn-Btn-sc-1a2b3c': ['.X{color:purple;}'],
      'Red-Red-sc-4d5e6f': ['.X{color:green;}'],
    });
  });

  it('does not let a class from one request name an outer in a later request', async () => {
    const Btn = styled.div`
      color: blue;
    `;
    const Wrap = (props: PassedProps) => <Btn {...props} />;
    const Red = styled(Wrap)`
      color: red;
    `;

    const first = await renderFlight(<Red data-probe="first" />);
    const wrapper = generatedClasses(first.probes.first).find(name => name !== 'first');
    const second = await renderFlight(<Btn className={wrapper} data-probe="second" />);

    expect(wrapper).toBeDefined();
    expect(styleProps(second)).toEqual([
      {
        chain: [
          [
            Btn.styledComponentId,
            generatedClasses(second.probes.second)[0],
            [`.${generatedClasses(second.probes.second)[0]}{color:blue;}`],
            groupForId(Btn.styledComponentId),
          ],
        ],
        keyframes: [],
        outers: [],
      },
    ]);
  });
});
