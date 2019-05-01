import { BenchmarkType } from '../app/Benchmark';
import { number, object } from 'prop-types';
import React from 'react';
import { interpolatePurples, interpolateBuPu, interpolateRdPu } from 'd3-scale-chromatic';

const targetSize = 10;

class SierpinskiTriangle extends React.Component {
  static displayName = 'SierpinskiTriangle';

  static benchmarkType = BenchmarkType.UPDATE;

  static propTypes = {
    components: object,
    depth: number,
    renderCount: number,
    s: number,
    x: number,
    y: number
  };

  static defaultProps = {
    depth: 0,
    renderCount: 0
  };

  render() {
    const { components, x, y, depth, renderCount } = this.props;
    let { s } = this.props;
    const { Dot } = components;

    if (Dot) {
      if (s <= targetSize) {
        let fn;
        switch (depth) {
          case 1:
            fn = interpolatePurples;
            break;
          case 2:
            fn = interpolateBuPu;
            break;
          case 3:
          default:
            fn = interpolateRdPu;
        }

        // introduce randomness to ensure that repeated runs don't produce the same colors
        const color = fn(renderCount * Math.random() / 20);
        return (
          <Dot color={color} size={targetSize} x={x - targetSize / 2} y={y - targetSize / 2} />
        );
      }

      s /= 2;

      return (
        <React.Fragment>
          <SierpinskiTriangle
            components={components}
            depth={1}
            renderCount={renderCount}
            s={s}
            x={x}
            y={y - s / 2}
          />
          <SierpinskiTriangle
            components={components}
            depth={2}
            renderCount={renderCount}
            s={s}
            x={x - s}
            y={y + s / 2}
          />
          <SierpinskiTriangle
            components={components}
            depth={3}
            renderCount={renderCount}
            s={s}
            x={x + s}
            y={y + s / 2}
          />
        </React.Fragment>
      );
    } else {
      return <span style={{ color: 'white' }}>No implementation available</span>;
    }
  }
}

export default SierpinskiTriangle;
