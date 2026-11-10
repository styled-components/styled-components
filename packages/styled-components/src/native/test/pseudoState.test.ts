import { Platform } from 'react-native';
import type { PseudoBearingConditionalStyle } from '../../models/compileNative';
import type { PseudoState, PseudoTerm } from '../../parser/ast';
import { DEFAULT_NATIVE_STYLE } from '../NativeStyleContext';
import styled from '..';
import { PSEUDO_BIT } from '../pseudoBits';
import {
  elementStates,
  normalizeDisabledProps,
  pseudoActive,
  STATELESS_PSEUDO_MASKS,
  warnInertPseudoStates,
} from '../pseudoState';
import { resetWarningsForTest } from '../transform/dev';

// Contract: docs/react-native.md "How native matches element states" and
// packages/styled-components/docs/rn-css-compatibility.md "React Native pseudo-states (equivalent to CSS pseudo-classes)".

test('every styled.X alias but Pressable has an element-state mask', () => {
  const aliases = Object.keys(styled).filter(key => key !== 'Pressable');
  expect(aliases.sort()).toEqual([...STATELESS_PSEUDO_MASKS.keys()].sort());
});

const DISABLED = 'disabled';
const READ_WRITE = 'read-write';
const NEITHER = 'neither';

/** The element state `elementStates` reports, spelled so a failing row names it. */
const statesOf = (leaf: string | undefined, props: Record<string, unknown>) => {
  const bits = elementStates(leaf, props);
  if (bits === 0) return NEITHER;
  if (bits === PSEUDO_BIT.disabled) return DISABLED;
  if (bits === PSEUDO_BIT.readWrite) return READ_WRITE;
  return 'bits ' + bits;
};

describe('elementStates', () => {
  it.each([
    ['no props', NEITHER, {}],
    ['disabled', DISABLED, { disabled: true }],
    ['disabled={false}', NEITHER, { disabled: false }],
    ['aria-disabled alone', NEITHER, { 'aria-disabled': true }],
    ['accessibilityState.disabled alone', NEITHER, { accessibilityState: { disabled: true } }],
    ['readOnly={false}', NEITHER, { readOnly: false }],
  ])('matches a Pressable with %s as: %s', (_name, expected, props) => {
    expect(statesOf('Pressable', props)).toBe(expected);
  });

  it.each([
    ['no props', NEITHER, {}],
    ['disabled', DISABLED, { disabled: true }],
    ['aria-disabled', DISABLED, { 'aria-disabled': true }],
    ['accessibilityState.disabled', DISABLED, { accessibilityState: { disabled: true } }],
    ['disabled={false} beside aria-disabled', NEITHER, { disabled: false, 'aria-disabled': true }],
    [
      'aria-disabled={false} beside accessibilityState.disabled',
      NEITHER,
      { 'aria-disabled': false, accessibilityState: { disabled: true } },
    ],
  ])('matches a TouchableOpacity with %s as: %s', (_name, expected, props) => {
    expect(statesOf('TouchableOpacity', props)).toBe(expected);
  });

  it.each([
    ['no props', NEITHER, {}],
    ['disabled', DISABLED, { disabled: true }],
    ['aria-disabled', DISABLED, { 'aria-disabled': true }],
    ['accessibilityState.disabled', DISABLED, { accessibilityState: { disabled: true } }],
    ['disabled={false} beside aria-disabled', NEITHER, { disabled: false, 'aria-disabled': true }],
    [
      'aria-disabled={false} beside accessibilityState.disabled',
      NEITHER,
      { 'aria-disabled': false, accessibilityState: { disabled: true } },
    ],
  ])('matches a Text with %s as: %s', (_name, expected, props) => {
    expect(statesOf('Text', props)).toBe(expected);
  });

  it.each([
    ['no props', NEITHER, {}],
    ['disabled', DISABLED, { disabled: true }],
    ['accessibilityState.disabled', DISABLED, { accessibilityState: { disabled: true } }],
    ['aria-disabled', NEITHER, { 'aria-disabled': true }],
    [
      'disabled={false} beside accessibilityState.disabled',
      NEITHER,
      { disabled: false, accessibilityState: { disabled: true } },
    ],
  ])('matches a TouchableHighlight with %s as: %s', (_name, expected, props) => {
    expect(statesOf('TouchableHighlight', props)).toBe(expected);
  });

  describe('Switch', () => {
    const realOS = Platform.OS;
    afterEach(() => {
      Platform.OS = realOS;
    });

    it.each([
      ['ios', 'no props', NEITHER, {}],
      ['ios', 'disabled', DISABLED, { disabled: true }],
      [
        'ios',
        'accessibilityState.disabled alone',
        NEITHER,
        { accessibilityState: { disabled: true } },
      ],
      ['android', 'no props', NEITHER, {}],
      ['android', 'disabled', DISABLED, { disabled: true }],
      [
        'android',
        'accessibilityState.disabled alone',
        DISABLED,
        { accessibilityState: { disabled: true } },
      ],
      [
        'android',
        'disabled={false} beside accessibilityState.disabled',
        NEITHER,
        { disabled: false, accessibilityState: { disabled: true } },
      ],
    ] as const)('matches a Switch on %s with %s as: %s', (os, _name, expected, props) => {
      Platform.OS = os;
      expect(statesOf('Switch', props)).toBe(expected);
    });
  });

  it.each([
    ['no props', READ_WRITE, {}],
    ['disabled={false}', READ_WRITE, { disabled: false }],
    ['readOnly', NEITHER, { readOnly: true }],
    ['readOnly={false}', READ_WRITE, { readOnly: false }],
    ['editable={false}', NEITHER, { editable: false }],
    ['editable={true}', READ_WRITE, { editable: true }],
    ['readOnly={false} beside editable={false}', READ_WRITE, { readOnly: false, editable: false }],
    ['readOnly beside editable={true}', NEITHER, { readOnly: true, editable: true }],
    ['aria-readonly', NEITHER, { 'aria-readonly': true }],
    ['aria-readonly={false}', READ_WRITE, { 'aria-readonly': false }],
    ['aria-readonly beside readOnly={false}', NEITHER, { 'aria-readonly': true, readOnly: false }],
    ['disabled', DISABLED, { disabled: true }],
    ['aria-disabled', DISABLED, { 'aria-disabled': true }],
    ['disabled beside editable={true}', DISABLED, { disabled: true, editable: true }],
    ['disabled beside readOnly={false}', DISABLED, { disabled: true, readOnly: false }],
  ])('matches a TextInput with %s as: %s', (_name, expected, props) => {
    expect(statesOf('TextInput', props)).toBe(expected);
  });

  it.each(['View', 'Text', 'ScrollView', 'Switch', 'TouchableWithoutFeedback'])(
    'never reads a %s as read-write',
    leaf => {
      expect(statesOf(leaf, { editable: true, readOnly: false })).toBe(NEITHER);
    }
  );

  it.each(['View', 'Button', 'ScrollView', 'TouchableWithoutFeedback', 'TouchableNativeFeedback'])(
    'never reads a %s as disabled',
    leaf => {
      expect(statesOf(leaf, { 'aria-disabled': true, disabled: true })).toBe(NEITHER);
    }
  );

  it.each([undefined, 'Forwarder'])(
    'reads a custom component named %s from its own props',
    leaf => {
      expect(statesOf(leaf, {})).toBe(NEITHER);
      expect(statesOf(leaf, { disabled: true })).toBe(DISABLED);
      expect(statesOf(leaf, { disabled: false })).toBe(NEITHER);
      expect(statesOf(leaf, { 'aria-disabled': true })).toBe(NEITHER);
      expect(statesOf(leaf, { readOnly: false })).toBe(READ_WRITE);
      expect(statesOf(leaf, { editable: true })).toBe(READ_WRITE);
      expect(statesOf(leaf, { editable: false })).toBe(NEITHER);
      expect(statesOf(leaf, { editable: false, readOnly: false })).toBe(READ_WRITE);
      expect(statesOf(leaf, { editable: true, readOnly: true })).toBe(NEITHER);
      expect(statesOf(leaf, { disabled: true, editable: true })).toBe(DISABLED);
    }
  );
});

describe('normalizeDisabledProps', () => {
  const DISABLED_TRANSLATION = {
    'aria-disabled': true,
    editable: false,
    focusable: false,
    readOnly: true,
  };

  it.each([
    ['disabled', { disabled: true }, { disabled: true, ...DISABLED_TRANSLATION }],
    ['aria-disabled', { 'aria-disabled': true }, DISABLED_TRANSLATION],
    [
      'disabled beside editable',
      { disabled: true, editable: true },
      { disabled: true, ...DISABLED_TRANSLATION },
    ],
    [
      'disabled beside readOnly={false}',
      { disabled: true, readOnly: false },
      { disabled: true, ...DISABLED_TRANSLATION },
    ],
    [
      'disabled beside tabIndex, which is dropped',
      { disabled: true, tabIndex: 0 },
      { disabled: true, ...DISABLED_TRANSLATION },
    ],
    [
      'disabled beside aria-readonly',
      { disabled: true, 'aria-readonly': true },
      { disabled: true, 'aria-readonly': true, ...DISABLED_TRANSLATION },
    ],
    ['aria-readonly', { 'aria-readonly': true }, { 'aria-readonly': true, readOnly: true }],
    [
      'aria-readonly beside editable={true}',
      { 'aria-readonly': true, editable: true },
      { 'aria-readonly': true, editable: true, readOnly: true },
    ],
  ])('translates the props of a TextInput given %s', (_name, props, expected) => {
    const forwarded: Record<string, unknown> = { ...props };
    normalizeDisabledProps('TextInput', forwarded);
    expect(forwarded).toStrictEqual(expected);
  });

  it.each([
    ['no props', {}],
    ['disabled={false}', { disabled: false }],
    ['aria-disabled={false}', { 'aria-disabled': false }],
    ['aria-readonly={false}', { 'aria-readonly': false }],
    ['editable and tabIndex', { editable: true, tabIndex: 0 }],
  ])('leaves a TextInput given %s as the caller wrote it', (_name, props) => {
    const forwarded: Record<string, unknown> = { ...props };
    normalizeDisabledProps('TextInput', forwarded);
    expect(forwarded).toStrictEqual(props);
  });

  it.each(['Pressable', 'View', 'Switch', 'Forwarder', undefined])(
    'leaves the props of a target named %s alone',
    leaf => {
      const props = {
        accessibilityState: { disabled: true },
        'aria-disabled': true,
        'aria-readonly': true,
        disabled: true,
        tabIndex: 0,
      };
      const forwarded: Record<string, unknown> = { ...props };
      normalizeDisabledProps(leaf, forwarded);
      expect(forwarded).toStrictEqual(props);
    }
  );
});

describe('pseudoActive', () => {
  const NO_STATE = {};

  it.each([
    ['hover', { hovered: true }, true],
    ['hover', { focused: true, pressed: true }, false],
    ['focus', { focused: true }, true],
    ['focus', { hovered: true, pressed: true }, false],
    ['pressed', { pressed: true }, true],
    ['pressed', { focused: true, hovered: true }, false],
  ] as const)('holds :%s for the press state %j: %s', (pseudo, state, expected) => {
    expect(pseudoActive(pseudo, state, 0)).toBe(expected);
  });

  it.each([
    ['disabled', 0, false],
    ['disabled', PSEUDO_BIT.disabled, true],
    ['enabled', 0, true],
    ['enabled', PSEUDO_BIT.disabled, false],
    ['enabled', PSEUDO_BIT.readWrite, true],
    ['readOnly', 0, true],
    ['readOnly', PSEUDO_BIT.readWrite, false],
    ['readOnly', PSEUDO_BIT.disabled, true],
    ['readWrite', 0, false],
    ['readWrite', PSEUDO_BIT.readWrite, true],
    ['readWrite', PSEUDO_BIT.disabled, false],
  ] as const)('holds :%s for element-state bits %i: %s', (pseudo, states, expected) => {
    expect(pseudoActive(pseudo, NO_STATE, states)).toBe(expected);
  });

  it.each(['disabled', 'enabled', 'readOnly', 'readWrite'] as const)(
    'reads :%s from the element state, never the press state',
    pseudo => {
      expect(pseudoActive(pseudo, { focused: true, hovered: true, pressed: true }, 0)).toBe(
        pseudoActive(pseudo, NO_STATE, 0)
      );
    }
  );

  it.each(['hover', 'focus', 'pressed'] as const)(
    'reads :%s from the press state, never the element state',
    pseudo => {
      expect(pseudoActive(pseudo, NO_STATE, PSEUDO_BIT.disabled | PSEUDO_BIT.readWrite)).toBe(
        false
      );
    }
  );
});

describe('warnInertPseudoStates', () => {
  const env = {
    colorScheme: 'light',
    fontScale: 1,
    height: 1334,
    pixelRatio: 2,
    reduceMotion: false,
    width: 750,
  } as const;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    resetWarningsForTest();
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  const MATCHING_MEDIA = '(min-width: 0px)';
  const NON_MATCHING_MEDIA = '(max-width: 0px)';

  const NO_INTERACTION_STATE =
    ' has no press, hover or focus state. Use `styled.Pressable` for press / hover / focus styling, or fence a web-only rule behind `@media (hover: hover)`.';
  const CANNOT_BE_DISABLED =
    ' cannot be disabled. Use `styled.Pressable`, `styled.Switch`, `styled.Text`, `styled.TouchableOpacity`, `styled.TouchableHighlight`, `styled.TextInput`, or a custom component given `disabled`.';
  const CANNOT_BE_EDITED =
    ' cannot be edited. Use `styled.TextInput`, or a custom component given `readOnly={false}` or `editable={true}`.';
  const APPLIES_NO_STYLE = 'it never applies the `style` it is given. Style its child instead.';
  const BUTTON_APPLIES_NO_STYLE =
    'it never applies the `style` it is given. Use `styled.Pressable` around a `Text` instead.';

  const warning = (selector: string, target: string, reason: string) =>
    '[sc] `' +
    selector +
    '` styles on a styled ' +
    target +
    ' never apply on React Native: ' +
    reason;

  const ACTIVE_ON_VIEW = warning(':active', 'View', 'View' + NO_INTERACTION_STATE);
  const DISABLED_ON_VIEW = warning(':disabled', 'View', 'View' + CANNOT_BE_DISABLED);
  const READ_WRITE_ON_VIEW = warning(':read-write', 'View', 'View' + CANNOT_BE_EDITED);

  const pseudo = (
    condition: PseudoState,
    { and, negate }: { and?: PseudoTerm[]; negate?: boolean } = {}
  ): PseudoBearingConditionalStyle => ({ and, condition, negate, styles: {}, type: 'pseudo' });

  const gated = (
    media: string,
    condition: PseudoState,
    { and, pseudoNegate }: { and?: PseudoTerm[]; pseudoNegate?: boolean } = {}
  ): PseudoBearingConditionalStyle => ({
    and,
    condition: media,
    pseudo: condition,
    pseudoNegate,
    styles: {},
    type: 'media',
  });

  const warningsFor = (entries: PseudoBearingConditionalStyle[], target: string) => {
    warnInertPseudoStates(entries, env, DEFAULT_NATIVE_STYLE.container, target);
    return warnSpy.mock.calls.map(call => String(call[0]));
  };

  it.each([
    ['&:active', pseudo('pressed'), ACTIVE_ON_VIEW],
    ['&:hover', pseudo('hover'), warning(':hover', 'View', 'View' + NO_INTERACTION_STATE)],
    ['&:focus', pseudo('focus'), warning(':focus', 'View', 'View' + NO_INTERACTION_STATE)],
    ['&:disabled', pseudo('disabled'), DISABLED_ON_VIEW],
    ['&:read-write', pseudo('readWrite'), READ_WRITE_ON_VIEW],
  ])('names what a View lacks for %s', (_selector, entry, expected) => {
    expect(warningsFor([entry], 'View')).toEqual([expected]);
  });

  it('warns for every unsupported rule, not only the first', () => {
    expect(
      warningsFor([pseudo('pressed'), pseudo('disabled'), pseudo('readWrite')], 'View')
    ).toEqual([ACTIVE_ON_VIEW, DISABLED_ON_VIEW, READ_WRITE_ON_VIEW]);
  });

  it('warns once per target and pseudo-class', () => {
    expect(warningsFor([pseudo('pressed'), pseudo('pressed')], 'View')).toEqual([ACTIVE_ON_VIEW]);
  });

  it('warns for :active only when a TouchableOpacity has :disabled and :active rules', () => {
    expect(warningsFor([pseudo('disabled'), pseudo('pressed')], 'TouchableOpacity')).toEqual([
      warning(':active', 'TouchableOpacity', 'TouchableOpacity' + NO_INTERACTION_STATE),
    ]);
  });

  it.each([
    ['&:enabled', 'View', pseudo('enabled')],
    ['&:read-only', 'View', pseudo('readOnly')],
    ['&:not(:read-only)', 'View', pseudo('readOnly', { negate: true })],
    ['&:not(:disabled)', 'View', pseudo('disabled', { negate: true })],
    ['&:not(:active)', 'View', pseudo('pressed', { negate: true })],
    ['&:not(:read-write)', 'View', pseudo('readWrite', { negate: true })],
    ['&:enabled', 'Text', pseudo('enabled')],
  ])('stays silent for %s on a %s', (_selector, target, entry) => {
    expect(warningsFor([entry], target)).toEqual([]);
  });

  it.each(['TouchableOpacity', 'TouchableHighlight', 'Switch', 'TextInput'])(
    'stays silent for :disabled, :enabled and :read-only on a %s',
    target => {
      expect(
        warningsFor([pseudo('disabled'), pseudo('enabled'), pseudo('readOnly')], target)
      ).toEqual([]);
    }
  );

  it('stays silent for :read-write on a TextInput and warns for it on a Switch', () => {
    expect(warningsFor([pseudo('readWrite')], 'TextInput')).toEqual([]);
    expect(warningsFor([pseudo('readWrite')], 'Switch')).toEqual([
      warning(':read-write', 'Switch', 'Switch' + CANNOT_BE_EDITED),
    ]);
  });

  it.each([
    [':disabled', 'disabled'],
    [':enabled', 'enabled'],
    [':read-only', 'readOnly'],
    [':read-write', 'readWrite'],
    [':active', 'pressed'],
    [':hover', 'hover'],
    [':focus', 'focus'],
  ] as const)(
    'warns for %s on a TouchableWithoutFeedback, which applies no style',
    (selector, state) => {
      expect(warningsFor([pseudo(state)], 'TouchableWithoutFeedback')).toEqual([
        warning(selector, 'TouchableWithoutFeedback', APPLIES_NO_STYLE),
      ]);
    }
  );

  it('warns for :disabled on a TouchableNativeFeedback, which applies no style', () => {
    expect(warningsFor([pseudo('disabled')], 'TouchableNativeFeedback')).toEqual([
      warning(':disabled', 'TouchableNativeFeedback', APPLIES_NO_STYLE),
    ]);
  });

  it.each([
    [':disabled', 'disabled'],
    [':enabled', 'enabled'],
    [':read-only', 'readOnly'],
    [':active', 'pressed'],
  ] as const)('warns for %s on a Button, which applies no style', (selector, state) => {
    expect(warningsFor([pseudo(state)], 'Button')).toEqual([
      warning(selector, 'Button', BUTTON_APPLIES_NO_STYLE),
    ]);
  });

  it('stays silent for :disabled, :enabled and :read-only on a Text', () => {
    expect(
      warningsFor([pseudo('disabled'), pseudo('enabled'), pseudo('readOnly')], 'Text')
    ).toEqual([]);
  });

  it('stays silent for a rule fenced behind a non-matching media query', () => {
    expect(warningsFor([gated(NON_MATCHING_MEDIA, 'disabled')], 'View')).toEqual([]);
  });

  it('warns for a rule inside a matching media query', () => {
    expect(warningsFor([gated(MATCHING_MEDIA, 'disabled')], 'View')).toEqual([DISABLED_ON_VIEW]);
  });

  it('stays silent for a negated pseudo-class inside a matching media query', () => {
    expect(warningsFor([gated(MATCHING_MEDIA, 'pressed', { pseudoNegate: true })], 'View')).toEqual(
      []
    );
  });

  it('tests every term of a compound: &:disabled:active warns for both terms on a View', () => {
    expect(
      warningsFor([pseudo('disabled', { and: [{ negate: false, pseudo: 'pressed' }] })], 'View')
    ).toEqual([DISABLED_ON_VIEW, ACTIVE_ON_VIEW]);
  });

  it.each([
    [
      '&:not(:disabled):active',
      pseudo('disabled', { and: [{ negate: false, pseudo: 'pressed' }], negate: true }),
    ],
    ['&:active:not(:disabled)', pseudo('pressed', { and: [{ negate: true, pseudo: 'disabled' }] })],
  ])('skips the negated term of %s and warns for :active only', (_selector, entry) => {
    expect(warningsFor([entry], 'View')).toEqual([ACTIVE_ON_VIEW]);
  });

  it('stays silent for a compound a TouchableOpacity supports', () => {
    expect(
      warningsFor(
        [pseudo('disabled', { and: [{ negate: false, pseudo: 'readOnly' }], negate: true })],
        'TouchableOpacity'
      )
    ).toEqual([]);
  });

  it('warns for the unsupported term of a compound inside a matching media query', () => {
    expect(
      warningsFor(
        [gated(MATCHING_MEDIA, 'enabled', { and: [{ negate: false, pseudo: 'readWrite' }] })],
        'View'
      )
    ).toEqual([READ_WRITE_ON_VIEW]);
  });
});
