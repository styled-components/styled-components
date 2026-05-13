import { Platform } from 'react-native';
import {
  getUserCallSite,
  resetWarningsForTest,
  warnIfAndroidSkew,
  warnIfIosVerticalAlign,
  warnIfSentinelLeak,
} from '../dev';

describe('warnIfSentinelLeak', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    resetWarningsForTest();
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('warns when a sentinel is glued to a leading number (JS arithmetic leak)', () => {
    warnIfSentinelLeak('paddingTop', '47\0sc:space.xl:55');
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toMatch(/createTheme token was concatenated/);
    expect(warnSpy.mock.calls[0][0]).toMatch(/paddingTop/);
  });

  it('warns when a sentinel is glued to an ident (string concat leak)', () => {
    warnIfSentinelLeak('color', 'red\0sc:colors.fg:#000');
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('warns when two sentinels are glued without a separator', () => {
    warnIfSentinelLeak('border', '\0sc:a:1\0sc:b:2');
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('does NOT warn for a clean single sentinel at index 0', () => {
    warnIfSentinelLeak('color', '\0sc:colors.fg:#000');
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('does NOT warn for sentinels separated by whitespace (e.g. border shorthand)', () => {
    warnIfSentinelLeak('border', '\0sc:borderWidth.hairline:1px solid \0sc:colors.ink:#000');
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('does NOT warn for sentinels separated by comma (multi-value contexts)', () => {
    warnIfSentinelLeak(
      'boxShadow',
      '0 1px 2px \0sc:colors.shadow:#000,0 4px 8px \0sc:colors.shadowDeep:#000'
    );
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('does NOT warn for sentinels inside a function call (preceded by paren)', () => {
    warnIfSentinelLeak('color', 'rgb(\0sc:colors.r:128, 0, 0)');
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('does NOT warn for non-string values', () => {
    warnIfSentinelLeak('padding', 16);
    warnIfSentinelLeak('opacity', 0.5 as any);
    warnIfSentinelLeak('width', null as any);
    warnIfSentinelLeak('flex', undefined as any);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('does NOT warn for plain strings without sentinels', () => {
    warnIfSentinelLeak('color', 'red');
    warnIfSentinelLeak('padding', '47px');
    warnIfSentinelLeak('background', 'linear-gradient(to right, red, blue)');
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('warns at most once per prop key', () => {
    warnIfSentinelLeak('paddingTop', '47\0sc:space.xl:55');
    warnIfSentinelLeak('paddingTop', '99\0sc:space.lg:34');
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('warns separately for distinct prop keys', () => {
    warnIfSentinelLeak('paddingTop', '47\0sc:space.xl:55');
    warnIfSentinelLeak('marginLeft', '99\0sc:space.lg:34');
    expect(warnSpy).toHaveBeenCalledTimes(2);
  });
});

describe('warnIfAndroidSkew', () => {
  const realOS = Platform.OS;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    resetWarningsForTest();
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
    Object.defineProperty(Platform, 'OS', { value: realOS, configurable: true });
  });

  function setPlatform(os: 'ios' | 'android' | 'web'): void {
    Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
  }

  it('warns once when transform contains skewX on Android', () => {
    setPlatform('android');
    warnIfAndroidSkew('skewX(-12deg) translateY(8px)');
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toMatch(/skewX.*ignored on Android/);
  });

  it('warns when transform contains skewY on Android', () => {
    setPlatform('android');
    warnIfAndroidSkew('skewY(15deg)');
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('warns when transform uses the bare skew() shorthand on Android', () => {
    setPlatform('android');
    warnIfAndroidSkew('skew(10deg, 5deg)');
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('does NOT warn on iOS', () => {
    setPlatform('ios');
    warnIfAndroidSkew('skewX(-12deg)');
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('does NOT warn on web', () => {
    setPlatform('web');
    warnIfAndroidSkew('skewX(-12deg)');
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('does NOT warn for transforms without skew', () => {
    setPlatform('android');
    warnIfAndroidSkew('translateX(16px) rotate(45deg) scale(1.2)');
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('does NOT match unrelated identifiers ending in skew', () => {
    setPlatform('android');
    // Hypothetical custom prop / arbitrary string. The regex anchors on
    // a word boundary + skew + (X|Y|nothing) + `(`, so this should not
    // trigger.
    warnIfAndroidSkew('myskewfn(1)');
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('does NOT warn for non-string values', () => {
    setPlatform('android');
    warnIfAndroidSkew(undefined);
    warnIfAndroidSkew(null);
    warnIfAndroidSkew([{ skewX: '-12deg' }] as unknown);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('warns at most once across many calls on Android', () => {
    setPlatform('android');
    warnIfAndroidSkew('skewX(-12deg)');
    warnIfAndroidSkew('skewY(15deg)');
    warnIfAndroidSkew('skew(5deg)');
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });
});

describe('warnIfIosVerticalAlign', () => {
  const realOS = Platform.OS;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    resetWarningsForTest();
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
    Object.defineProperty(Platform, 'OS', { value: realOS, configurable: true });
  });

  function setPlatform(os: 'ios' | 'android' | 'web'): void {
    Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
  }

  it('warns when middle is set on iOS', () => {
    setPlatform('ios');
    warnIfIosVerticalAlign('middle');
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toMatch(/`vertical-align: middle` has no effect on iOS/);
    expect(warnSpy.mock.calls[0][0]).toMatch(/`<Text>` or `<TextInput>`/);
    expect(warnSpy.mock.calls[0][0]).toMatch(/wrap it in a View with `justify-content/);
    expect(warnSpy.mock.calls[0][0]).toMatch(/`<TextInput>` has no Text-level workaround/);
  });

  it('warns for top and bottom too', () => {
    setPlatform('ios');
    warnIfIosVerticalAlign('top');
    warnIfIosVerticalAlign('bottom');
    expect(warnSpy).toHaveBeenCalledTimes(2);
  });

  it('does NOT warn for the default `auto` value', () => {
    setPlatform('ios');
    warnIfIosVerticalAlign('auto');
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('does NOT warn on Android', () => {
    setPlatform('android');
    warnIfIosVerticalAlign('middle');
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('does NOT warn on web', () => {
    setPlatform('web');
    warnIfIosVerticalAlign('middle');
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('dedupes per value so each distinct value warns once', () => {
    setPlatform('ios');
    warnIfIosVerticalAlign('middle');
    warnIfIosVerticalAlign('middle');
    warnIfIosVerticalAlign('bottom');
    warnIfIosVerticalAlign('bottom');
    expect(warnSpy).toHaveBeenCalledTimes(2);
  });
});

describe('warning call-site picker', () => {
  it('picks the first user-code frame from a typical stack', () => {
    const stack = [
      'Error',
      '    at warnOnce (/repo/packages/styled-components/src/native/transform/dev.ts:60:5)',
      '    at warnIfAndroidSkew (/repo/packages/styled-components/src/native/transform/dev.ts:90:3)',
      '    at transformDecl (/repo/packages/styled-components/src/native/transform/index.ts:81:7)',
      '    at transformPair (/repo/packages/styled-components/src/models/compileNative.ts:1004:21)',
      '    at Tile (/Users/me/app/widgets/TransformPlayground.tsx:42:10)',
      '    at React (/Users/me/app/node_modules/react-dom/index.js:1:1)',
    ].join('\n');
    expect(getUserCallSite(stack)).toBe(
      'at Tile (/Users/me/app/widgets/TransformPlayground.tsx:42:10)'
    );
  });

  it('skips both src and dist styled-components paths', () => {
    const stack = [
      'Error',
      '    at warnOnce (/dist/styled-components/dist/dev.js:8:5)',
      '    at transformDecl (/dist/styled-components/native/dist/transform.js:10:1)',
      '    at userComponent (/Users/me/app/Card.tsx:5:1)',
    ].join('\n');
    expect(getUserCallSite(stack)).toBe('at userComponent (/Users/me/app/Card.tsx:5:1)');
  });

  it('returns null when only SC frames are present', () => {
    const stack = [
      'Error',
      '    at warnOnce (/repo/packages/styled-components/src/native/transform/dev.ts:60:5)',
      '    at warnIfAndroidSkew (/repo/packages/styled-components/src/native/transform/dev.ts:90:3)',
    ].join('\n');
    expect(getUserCallSite(stack)).toBeNull();
  });

  it('skips node:internal/ frames', () => {
    const stack = [
      'Error',
      '    at warnOnce (/repo/packages/styled-components/src/native/transform/dev.ts:60:5)',
      '    at process.processTicksAndRejections (node:internal/process/task_queues:96:5)',
      '    at userCallSite (/Users/me/app/main.ts:1:1)',
    ].join('\n');
    expect(getUserCallSite(stack)).toBe('at userCallSite (/Users/me/app/main.ts:1:1)');
  });

  it('returns null on a malformed stack with no frames', () => {
    expect(getUserCallSite('Error\n    nothing here\n    junk')).toBeNull();
  });

  it('skips Metro/Hermes bundle frames where source info is not yet symbolicated', () => {
    // Real shape from Metro dev on Android: every frame URL points into
    // the concatenated entry.bundle with line:col offsets, function name
    // is reported as "anonymous". These frames are useless without
    // sourcemap resolution, which we can't do synchronously; fall through
    // to null so the warning omits the noisy "Called from:" suffix.
    const stack = [
      'Error',
      '    at warnOnce (http://10.0.2.2:8081/entry.bundle/?platform=android:148000:5)',
      '    at warnIfAndroidSkew (http://10.0.2.2:8081/entry.bundle/?platform=android:148100:3)',
      '    at anonymous (http://10.0.2.2:8081/node_modules/expo-router/entry.bundle/?platform=android:148330:24)',
    ].join('\n');
    expect(getUserCallSite(stack)).toBeNull();
  });

  it('does not skip a real source path that happens to mention bundle in a directory name', () => {
    // Defensive: bundleFrame regex is anchored on `.bundle/`, `.bundle?`,
    // or `.bundle:` so a project directory called `bundles/` or `dist-bundle/`
    // shouldn't be filtered.
    const stack = [
      'Error',
      '    at warnOnce (/repo/packages/styled-components/src/native/transform/dev.ts:60:5)',
      '    at userComponent (/Users/me/bundles/app/Card.tsx:5:1)',
    ].join('\n');
    expect(getUserCallSite(stack)).toBe('at userComponent (/Users/me/bundles/app/Card.tsx:5:1)');
  });
});
