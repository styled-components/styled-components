describe('createStyleElement', () => {
  const load = (version: string | undefined, isRsc = true) => {
    let mod: typeof import('../styleTagContent') | undefined;
    try {
      jest.isolateModules(() => {
        const actualReact = jest.requireActual('react');
        jest.doMock('react', () => ({
          ...actualReact,
          createContext: isRsc ? undefined : actualReact.createContext,
          version,
        }));
        mod = require('../styleTagContent');
      });
    } finally {
      jest.dontMock('react');
    }

    if (!mod) throw new Error('Failed to load styleTagContent');
    return mod.createStyleElement;
  };

  it('passes CSS as raw HTML on React before 19 in RSC mode', () => {
    const el = load('18.3.0-canary-178c267a4e-20241218')({ key: 'k' }, '.a>.b{content:"x"}');
    expect(el.type).toBe('style');
    expect(el.key).toBe('k');
    expect(el.props).toEqual({
      dangerouslySetInnerHTML: { __html: '.a>.b{content:"x"}' },
    });
  });

  it('escapes closing style tags while preserving case and preceding backslashes', () => {
    const el = load('18.3.1')({ key: 'k' }, 'a{content:"</style></STYLE></StYlE>\\</style>"}');
    expect(el.props).toEqual({
      dangerouslySetInnerHTML: {
        __html: 'a{content:"</\\73 tyle></\\53 TYLE></\\53 tYlE>\\</\\73 tyle>"}',
      },
    });
  });

  it('fails safe to raw HTML on experimental and missing React.version strings in RSC mode', () => {
    expect(load('0.0.0-experimental-abc123')({ key: 'k' }, '.a>.b{}').props).toEqual({
      dangerouslySetInnerHTML: { __html: '.a>.b{}' },
    });
    expect(load(undefined)({ key: 'k' }, '.a>.b{}').props).toEqual({
      dangerouslySetInnerHTML: { __html: '.a>.b{}' },
    });
  });

  it('passes CSS as text children on React 19, which writes style text raw', () => {
    const el = load('19.2.0')({ key: 'k' }, '.a>.b{content:"</style>"}');
    expect(el.props).toEqual({
      children: '.a>.b{content:"</style>"}',
    });
  });

  it('keeps text children when not in RSC mode', () => {
    const el = load('18.3.1', false)({ key: 'k' }, '.a>.b{}');
    expect(el.props).toEqual({
      children: '.a>.b{}',
    });
  });
});
