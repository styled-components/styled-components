import Keyframes, { KeyframesCompiler } from '../Keyframes';
import { mainCompiler } from '../StyleSheetManager';

function countingCompiler(hash: string): KeyframesCompiler & { calls: number } {
  const compiler = {
    calls: 0,
    compile: (css: string, name: string, prefix: string) => {
      compiler.calls++;
      return [prefix + ' ' + name + '{' + css + '}'];
    },
    hash,
  };
  return compiler;
}

describe('Keyframes', () => {
  it('should throw an error when converted to string', () => {
    const keyframes = new Keyframes('foo', 'bar');
    expect(() => keyframes.toString()).toThrowErrorMatchingInlineSnapshot(
      `"It seems you are interpolating a keyframe declaration (foo) into an untagged string. Please wrap your string in the css\\\`\\\` helper which ensures the styles are injected correctly. See https://styled-components.com/docs/api#css"`
    );
  });

  describe('compile', () => {
    it('compiles once per compiler and returns the same result on every later call', () => {
      const keyframes = new Keyframes('fade', 'from{opacity:0}');
      const compiler = countingCompiler('');

      const first = keyframes.compile(compiler);
      expect(first).toEqual({
        id: 'sc-keyframes-fade',
        name: 'fade',
        rules: ['@keyframes fade{from{opacity:0}}'],
      });
      expect(keyframes.compile(compiler)).toBe(first);
      expect(keyframes.compile(compiler)).toBe(first);
      expect(compiler.calls).toBe(1);
    });

    it('keeps a separate result for each compiler, each compiled once', () => {
      const keyframes = new Keyframes('fade', 'from{opacity:0}');
      const plain = countingCompiler('');
      const hashed = countingCompiler('123');

      const a = keyframes.compile(plain);
      const b = keyframes.compile(hashed);
      const c = keyframes.compile(countingCompiler('456'));

      expect(a.name).toBe('fade');
      expect(b.name).toBe(keyframes.getName(hashed));
      expect(c.name).toBe(keyframes.getName({ hash: '456' }));
      expect(b.name).not.toBe(a.name);
      expect(c.name).not.toBe(b.name);

      expect(keyframes.compile(plain)).toBe(a);
      expect(keyframes.compile(hashed)).toBe(b);
      expect(plain.calls).toBe(1);
      expect(hashed.calls).toBe(1);
    });

    it('defaults to the main compiler and shares its result with an explicit main compiler call', () => {
      const keyframes = new Keyframes('fade', 'from{opacity:0}');
      expect(keyframes.compile()).toBe(keyframes.compile(mainCompiler));
    });
  });
});
