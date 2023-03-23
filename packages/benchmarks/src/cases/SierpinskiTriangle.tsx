import { interpolateBuPu, interpolatePurples, interpolateRdPu } from 'd3-scale-chromatic';
import React from 'react';
import { BenchmarkType } from '../app/Benchmark';

const targetSize = 10;

type ISierpinskiTriangle = {
  components: {
    Dot: React.FC<any>;
  };
  depth: number;
  renderCount: number;
  s: number;
  x: number;
  y: number;
};

export default function SierpinskiTriangle({
  components,
  s,
  x,
  y,
  depth = 0,
  renderCount = 0,
}: ISierpinskiTriangle) {
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
      const color = fn((renderCount * Math.random()) / 20);
      return <Dot color={color} size={targetSize} x={x - targetSize / 2} y={y - targetSize / 2} />;
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

SierpinskiTriangle.displayName = 'SierpinskiTriangle';
SierpinskiTriangle.benchmarkType = BenchmarkType.UPDATE;
