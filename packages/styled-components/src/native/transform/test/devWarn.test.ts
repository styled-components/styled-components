import { resetWarningsForTest, warnIfSentinelLeak } from '../dev';

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
    expect(warnSpy.mock.calls[0][0]).toMatch(/createTheme token leaked/);
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
