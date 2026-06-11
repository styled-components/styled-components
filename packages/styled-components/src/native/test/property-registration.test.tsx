/**
 * The @property rule (CSS Properties and Values API Level 1) on React
 * Native: registered custom properties with typed initial values and
 * inheritance control.
 *
 * Drafts source: https://drafts.css-houdini.org/css-properties-values-api/
 * (fetched 2026-06-09). Normative anchors:
 * - §3: "@property rules require a syntax and inherits descriptor; if
 *   either are missing, the entire rule is invalid and must be ignored.
 *   The initial-value descriptor is optional only if the syntax is the
 *   universal syntax definition, otherwise the descriptor is required;
 *   if it's missing, the entire rule is invalid and must be ignored."
 * - §3.3: "The initial-value descriptor's value must parse successfully
 *   according to the grammar specified by the syntax definition."
 * - §3.3: "If the value of the syntax descriptor is the universal syntax
 *   definition, then the initial-value descriptor is optional. If
 *   omitted, the initial value of the property is the guaranteed-invalid
 *   value."
 * - §3 note: "if multiple valid @property rules are defined for the same
 *   <custom-property-name>, the last one in stylesheet order 'wins'."
 * - §3.2 inherits: "controlling whether or not the property inherits by
 *   default."
 *
 * Native deviations (documented):
 * - Registrations are app-global at style-construction time (matching
 *   the rule's document-global scope; there is no per-document scoping
 *   on RN).
 * - Supported syntax strings: '*', '<length>', '<number>',
 *   '<percentage>', '<integer>', '<angle>', '<time>', '<color>'. Other
 *   syntax components warn and the rule is ignored, per the spec's
 *   invalid-syntax-string handling.
 * - On the web bundle the registration is forwarded to the browser's
 *   CSS.registerProperty() and var() stays browser-resolved.
 */
import React from 'react';
import TestRenderer from 'react-test-renderer';
import { View } from 'react-native';

import styled from '..';
import { resetCssPropertiesForTest } from '../propertyRegistry';
import { resetNativeStyleCache } from '../../models/compileNative';
import { resetWarningsForTest } from '../transform/dev';
import { describeOnRnWeb } from '../transform/describeOnRnWeb';

function styleOf(el: React.ReactElement): any {
  const tree = TestRenderer.create(el);
  const views = tree.root.findAllByType(View);
  const style = views[views.length - 1].props.style;
  const layers = Array.isArray(style) ? style.flat(Infinity) : [style];
  return Object.assign({}, ...layers.filter((l: any) => l && typeof l === 'object'));
}

let warnSpy: jest.SpyInstance;

beforeEach(() => {
  resetNativeStyleCache();
  resetWarningsForTest();
  resetCssPropertiesForTest();
  warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  warnSpy.mockRestore();
});

describe('@property spec compliance (CSS Properties and Values API §3)', () => {
  describe('registration and initial-value backing', () => {
    it('an unset registered property resolves var() to its initial value', () => {
      const Box = styled(View)`
        @property --gauge {
          syntax: '<percentage>';
          inherits: true;
          initial-value: 25%;
        }
        width: var(--gauge);
      `;
      expect(styleOf(<Box />).width).toBe('25%');
    });

    it('a cascade value wins over the registered initial value', () => {
      const Box = styled(View)`
        @property --gauge {
          syntax: '<percentage>';
          inherits: true;
          initial-value: 25%;
        }
        --gauge: 75%;
        width: var(--gauge);
      `;
      expect(styleOf(<Box />).width).toBe('75%');
    });

    it('typed lengths back var() with device px', () => {
      const Box = styled(View)`
        @property --pad {
          syntax: '<length>';
          inherits: true;
          initial-value: 12px;
        }
        padding-top: var(--pad);
      `;
      expect(styleOf(<Box />).paddingTop).toBe(12);
    });

    it('the last registration in stylesheet order wins', () => {
      const Box = styled(View)`
        @property --x {
          syntax: '<number>';
          inherits: true;
          initial-value: 1;
        }
        @property --x {
          syntax: '<number>';
          inherits: true;
          initial-value: 2;
        }
        opacity: var(--x);
      `;
      expect(styleOf(<Box />).opacity).toBe(2);
    });
  });

  describe('rule validation', () => {
    it('a missing inherits descriptor invalidates the rule', () => {
      const Box = styled(View)`
        @property --bad {
          syntax: '<number>';
          initial-value: 1;
        }
        opacity: var(--bad, 0.5);
      `;
      expect(styleOf(<Box />).opacity).toBe(0.5);
    });

    it('a missing syntax descriptor invalidates the rule', () => {
      const Box = styled(View)`
        @property --bad {
          inherits: true;
          initial-value: 1;
        }
        opacity: var(--bad, 0.5);
      `;
      expect(styleOf(<Box />).opacity).toBe(0.5);
    });

    it('a non-universal syntax without initial-value invalidates the rule', () => {
      const Box = styled(View)`
        @property --bad {
          syntax: '<number>';
          inherits: true;
        }
        opacity: var(--bad, 0.5);
      `;
      expect(styleOf(<Box />).opacity).toBe(0.5);
    });

    it('an initial-value that fails the syntax grammar invalidates the rule', () => {
      const Box = styled(View)`
        @property --bad {
          syntax: '<number>';
          inherits: true;
          initial-value: red;
        }
        opacity: var(--bad, 0.5);
      `;
      expect(styleOf(<Box />).opacity).toBe(0.5);
    });

    it("the universal syntax '*' registers without an initial value (guaranteed-invalid)", () => {
      const Box = styled(View)`
        @property --any {
          syntax: '*';
          inherits: true;
        }
        opacity: var(--any, 0.5);
      `;
      // Unset + guaranteed-invalid initial: the var() fallback applies.
      expect(styleOf(<Box />).opacity).toBe(0.5);
    });
  });

  describe('the inherits descriptor', () => {
    it('inherits: false cuts the cascade; descendants see the initial value', () => {
      const Parent = styled(View)`
        --pin: 20px;
        flex: 1;
      `;
      const Child = styled(View)`
        @property --pin {
          syntax: '<length>';
          inherits: false;
          initial-value: 4px;
        }
        padding-top: var(--pin);
      `;
      expect(
        styleOf(
          <Parent>
            <Child />
          </Parent>
        ).paddingTop
      ).toBe(4);
    });

    it('inherits: false still honors the declaring element itself', () => {
      const Child = styled(View)`
        @property --pin {
          syntax: '<length>';
          inherits: false;
          initial-value: 4px;
        }
        --pin: 12px;
        padding-top: var(--pin);
      `;
      expect(styleOf(<Child />).paddingTop).toBe(12);
    });

    it('inherits: true keeps normal cascade inheritance (control)', () => {
      const Parent = styled(View)`
        --pin: 20px;
        flex: 1;
      `;
      const Child = styled(View)`
        @property --pin {
          syntax: '<length>';
          inherits: true;
          initial-value: 4px;
        }
        padding-top: var(--pin);
      `;
      expect(
        styleOf(
          <Parent>
            <Child />
          </Parent>
        ).paddingTop
      ).toBe(20);
    });
  });

  describeOnRnWeb('on rn-web', () => {
    it('forwards the registration to CSS.registerProperty for the browser', () => {
      const registerProperty = jest.fn();
      const prevCSS = (globalThis as any).CSS;
      (globalThis as any).CSS = { registerProperty };
      try {
        const Box = styled(View)`
          @property --web-gauge {
            syntax: '<percentage>';
            inherits: true;
            initial-value: 25%;
          }
          flex: 1;
        `;
        TestRenderer.create(<Box />);
        expect(registerProperty).toHaveBeenCalledWith({
          name: '--web-gauge',
          syntax: '<percentage>',
          inherits: true,
          initialValue: '25%',
        });
      } finally {
        (globalThis as any).CSS = prevCSS;
      }
    });
  });
});
