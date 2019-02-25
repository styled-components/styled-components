// @flow
import React from 'react';
import TestRenderer from 'react-test-renderer';

import { resetPlaceable } from './utils';

let placeable;

describe('warn too many classes', () => {
  const nativeWarn = console.warn;
  let warnCallCount;
  /**
   * Make sure the setup is the same for every test
   */
  beforeEach(() => {
    (console: any).warn = () => warnCallCount++;
    warnCallCount = 0;
    placeable = resetPlaceable();
  });

  afterEach(() => {
    (console: any).warn = nativeWarn;
  });

  it('should warn once', () => {
    const Comp = placeable.div`
      width: ${props => props.size};
    `;
    for (let i = 0; i < 300; i++) {
      TestRenderer.create(<Comp size={i} />);
    }
    expect(warnCallCount).toEqual(1);
  });

  it('should warn if number of classes is 200', () => {
    const Comp = placeable.div`
      width: ${props => props.size};
    `;
    for (let i = 0; i < 200; i++) {
      TestRenderer.create(<Comp size={i} />);
    }
    expect(warnCallCount).toEqual(1);
  });

  it('should not warn if number of classes is below 200', () => {
    const Comp = placeable.div`
      width: ${props => props.size};
    `;
    for (let i = 0; i < 199; i++) {
      TestRenderer.create(<Comp size={i} />);
    }

    expect(warnCallCount).toEqual(0);
  });
});
