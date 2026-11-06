/**
 * @jest-environment node
 * @jest-environment-options {"customExportConditions": ["react-server", "node", "node-addons"]}
 */

// Renders with the real Flight server under the `react-server` export condition, so
// Flight's own task order (async resumption, size-deferred elements) and its
// request-scoped `React.cache` decide when each styled element renders and what it
// can see. See docs/react.md "Order-proof extensions and wrappers".
import React from 'react';
import styled from '../../index';
import {
  FILLER_PARAGRAPHS,
  Filler,
  clientComponent,
  renderFlight,
  type Probe,
} from '../../test/flight';

type PassedProps = { className?: string };

/** The classes of a probe element that are not component ids (`sc-xxxx`, or `Name-sc-xxxx` with a build plugin). */
const generatedClasses = (probe: Probe): string[] =>
  probe.className.split(' ').filter(name => !name.includes('sc-'));

/** A probe's CSS with its one generated class replaced by `X`, so apps compare by shape. */
function shapeOf(probe: Probe): string | null {
  const [generated] = generatedClasses(probe);

  return probe.css === null ? null : probe.css.replaceAll(generated, 'X');
}

describe('wrapped styled components under Flight', () => {
  it('folds a wrapper that resumes after an await into the element it renders', async () => {
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

    const { errors, probes } = await renderFlight(
      <main>
        <Red data-probe="async" />
        <Btn data-probe="base" />
      </main>
    );

    expect(errors).toEqual([]);
    expect(generatedClasses(probes.async)).toHaveLength(1);
    expect(shapeOf(probes.async)).toBe('.X{color:blue;}.X{color:red;}');
    expect(shapeOf(probes.base)).toBe('.X{color:blue;}');
  });

  it('folds a wrapper whose element Flight deferred behind a large sibling', async () => {
    const Btn = styled.div`
      color: blue;
    `;
    const Wrap = (props: PassedProps) => <Btn {...props} />;
    const Red = styled(Wrap)`
      color: crimson;
    `;

    const { probes } = await renderFlight(
      <main>
        <Filler />
        <Red data-probe="deferred" />
        <Btn data-probe="base" />
      </main>
    );

    expect(shapeOf(probes.deferred)).toBe('.X{color:blue;}.X{color:crimson;}');
    expect(shapeOf(probes.base)).toBe('.X{color:blue;}');
    // The case only means something when Flight deferred the filler's paragraphs, each into its own
    // row, so every row after them is numbered past them (rows are hex ids).
    expect(parseInt(probes.deferred.row, 16)).toBeGreaterThan(FILLER_PARAGRAPHS);
  });

  it('folds a wrapper that reorders the classes it passes down', async () => {
    const Btn = styled.div`
      color: blue;
    `;
    const Reorder = ({ className = '' }: PassedProps) => (
      <Btn className={className.split(' ').reverse().join(' ')} data-probe="reorder" />
    );
    const Red = styled(Reorder)`
      color: maroon;
    `;

    const { probes } = await renderFlight(<Red />);

    expect(shapeOf(probes.reorder)).toBe('.X{color:blue;}.X{color:maroon;}');
  });

  it('passes a wrapper of a client component its own id and generated class, and emits that class rule', async () => {
    const Link = clientComponent<PassedProps>('Link');
    const Red = styled(Link)`
      color: tomato;
    `;

    const { clientProps, errors, payload } = await renderFlight(<Red />);
    const [id, generated] = String(clientProps[0].className).split(' ');
    const rule = new RegExp(`"(\\.${generated}\\{[^"]*\\})"`).exec(payload)?.[1];

    expect(errors).toEqual([]);
    expect(clientProps).toHaveLength(1);
    expect(id).toBe(Red.styledComponentId);
    expect(rule).toBe(`.${generated}{color:tomato;}`);
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

    const [first, second] = await Promise.all([
      renderFlight(app('blue', 'red')),
      renderFlight(app('purple', 'green')),
    ]);

    expect(new Set(Object.values(first.probes).map(shapeOf))).toEqual(
      new Set(['.X{color:blue;}.X{color:red;}'])
    );
    expect(new Set(Object.values(second.probes).map(shapeOf))).toEqual(
      new Set(['.X{color:purple;}.X{color:green;}'])
    );
  });

  it('does not let a wrapper class from one request fold rules into a later request', async () => {
    const Btn = styled.div`
      color: blue;
    `;
    const Wrap = (props: PassedProps) => <Btn {...props} />;
    const Red = styled(Wrap)`
      color: red;
    `;

    const first = await renderFlight(<Red data-probe="first" />);
    const wrapper = /"\.(\w+)\{color:red;\}"/.exec(first.payload)?.[1];
    const second = await renderFlight(<Btn className={wrapper} data-probe="second" />);

    expect(wrapper).toBeDefined();
    expect(generatedClasses(second.probes.second)[1]).toBe(wrapper);
    expect(shapeOf(second.probes.second)).toBe('.X{color:blue;}');
  });
});
