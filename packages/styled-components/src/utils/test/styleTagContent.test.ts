describe('styleTagContent', () => {
  const load = (version: string) => {
    let mod: typeof import('../styleTagContent') | undefined;
    jest.isolateModules(() => {
      jest.doMock('react', () => ({ ...jest.requireActual('react'), version }));
      mod = require('../styleTagContent');
    });
    jest.dontMock('react');
    return mod!.styleTagContent;
  };

  it('passes CSS as raw HTML on React before 19, which escapes style text', () => {
    expect(load('18.3.0-canary-178c267a4e-20241218')('.a>.b{content:"x"}')).toEqual({
      dangerouslySetInnerHTML: { __html: '.a>.b{content:"x"}' },
    });
  });

  it('escapes every closing style tag in the raw HTML, in any case', () => {
    expect(load('18.3.1')('a{content:"</style></STYLE>"}')).toEqual({
      dangerouslySetInnerHTML: { __html: 'a{content:"\\3C/style>\\3C/style>"}' },
    });
  });

  it('passes CSS as text children on React 19, which writes style text raw', () => {
    expect(load('19.2.0')('.a>.b{content:"</style>"}')).toEqual({
      children: '.a>.b{content:"</style>"}',
    });
  });
});
