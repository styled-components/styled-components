import StyleSheet from '../sheet/Sheet';

describe('StyleSheet', () => {
  describe('.v mutation counter', () => {
    let sheet: StyleSheet;

    beforeEach(() => {
      sheet = new StyleSheet({ isServer: true });
    });

    it('starts at Number.MIN_SAFE_INTEGER', () => {
      expect(sheet.v).toBe(Number.MIN_SAFE_INTEGER);
    });

    it('increments on insertRules', () => {
      const before = sheet.v;
      sheet.insertRules('test-id', 'a', ['.a { color: red; }']);
      expect(sheet.v).toBe(before + 1);
    });

    it('increments on clearRules', () => {
      sheet.insertRules('test-id', 'a', ['.a { color: red; }']);
      const before = sheet.v;
      sheet.clearRules('test-id');
      expect(sheet.v).toBe(before + 1);
    });

    it('increments on clearTag', () => {
      const before = sheet.v;
      sheet.clearTag();
      expect(sheet.v).toBe(before + 1);
    });

    it('does not increment on read-only operations', () => {
      sheet.insertRules('test-id', 'a', ['.a { color: red; }']);
      const before = sheet.v;

      sheet.hasNameForId('test-id', 'a');
      sheet.getTag();
      sheet.toString();

      expect(sheet.v).toBe(before);
    });

    it('is never 0', () => {
      // Starting from MIN_SAFE_INTEGER, 0 is unreachable in practice,
      // but the _tick() logic explicitly skips it via || 1
      const s = new StyleSheet({ isServer: true });
      // Force v to -1 so next tick would produce 0
      (s as any).v = -1;
      s.clearTag();
      expect(s.v).toBe(1);
    });

    it('is not copied by reconstructWithOptions', () => {
      sheet.insertRules('test-id', 'a', ['.a { color: red; }']);
      expect(sheet.v).not.toBe(Number.MIN_SAFE_INTEGER);

      const newSheet = sheet.reconstructWithOptions({ isServer: true });
      expect(newSheet.v).toBe(Number.MIN_SAFE_INTEGER);
    });

    it('wraps from MAX_SAFE_INTEGER to MIN_SAFE_INTEGER', () => {
      (sheet as any).v = Number.MAX_SAFE_INTEGER;
      sheet.clearTag();
      expect(sheet.v).toBe(Number.MIN_SAFE_INTEGER);
    });
  });
});
