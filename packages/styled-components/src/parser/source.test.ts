import { NodeKind } from './ast';
import { parseSource } from './source';

// Helper to make tagged-template test inputs feel natural.
const tagged = (strings: ReadonlyArray<string>, ...interps: unknown[]) =>
  parseSource(strings, interps);

describe('parseSource', () => {
  describe('static templates (no interpolations)', () => {
    it('parses an empty template', () => {
      const src = parseSource([''], []);
      expect(src.ast).toEqual([]);
      expect(src.interpolations).toEqual([]);
    });

    it('parses a simple decl', () => {
      const src = parseSource(['color: red;'], []);
      expect(src.ast).toEqual([{ kind: NodeKind.Decl, prop: 'color', value: 'red' }]);
    });
  });

  describe('value-position interpolations', () => {
    it('embeds sentinel when slot follows a colon', () => {
      const src = tagged`color: ${'red'};`;
      // Sentinel rides inside the value string (kind `\0I`); no Interpolation node.
      expect(src.ast).toEqual([{ kind: NodeKind.Decl, prop: 'color', value: '\0I0\0' }]);
      expect(src.interpolations).toEqual(['red']);
    });

    it('embeds sentinel when slot is wedged between value tokens', () => {
      const src = tagged`padding: 0 ${10}px;`;
      expect(src.ast).toEqual([{ kind: NodeKind.Decl, prop: 'padding', value: '0 \0I0\0px' }]);
    });

    it('keeps both slots embedded when value has two space-separated slots before `;`', () => {
      const src = tagged`padding: ${'8px'} ${'16px'};`;
      expect(src.ast).toEqual([{ kind: NodeKind.Decl, prop: 'padding', value: '\0I0\0 \0I1\0' }]);
    });
  });

  // Shorthand patterns that previously misclassified the trailing slot as a
  // standalone block-level interpolation. The classifier shipped with v7
  // returned `standalone` whenever a slot's prefix was whitespace-only AND
  // the suffix's first non-whitespace was `;`/`,`/etc., which collapsed
  // values like `${a} ${b};` to a half-filled decl. These guard against
  // regressing across the common multi-value CSS shorthand surface area.
  describe('multi-slot decl values stay embedded', () => {
    it('padding 4-value shorthand', () => {
      const src = tagged`padding: ${'1px'} ${'2px'} ${'3px'} ${'4px'};`;
      expect(src.ast).toEqual([
        {
          kind: NodeKind.Decl,
          prop: 'padding',
          value: '\0I0\0 \0I1\0 \0I2\0 \0I3\0',
        },
      ]);
    });

    it('margin 3-value shorthand', () => {
      const src = tagged`margin: ${'1px'} ${'2px'} ${'3px'};`;
      expect(src.ast).toEqual([
        {
          kind: NodeKind.Decl,
          prop: 'margin',
          value: '\0I0\0 \0I1\0 \0I2\0',
        },
      ]);
    });

    it('border shorthand: width style color', () => {
      const src = tagged`border: ${'1px'} solid ${'#000'};`;
      expect(src.ast).toEqual([
        { kind: NodeKind.Decl, prop: 'border', value: '\0I0\0 solid \0I1\0' },
      ]);
    });

    it('box-shadow with x y blur color', () => {
      const src = tagged`box-shadow: ${'0'} ${'2px'} ${'4px'} ${'rgba(0,0,0,0.1)'};`;
      expect(src.ast).toEqual([
        {
          kind: NodeKind.Decl,
          prop: 'box-shadow',
          value: '\0I0\0 \0I1\0 \0I2\0 \0I3\0',
        },
      ]);
    });

    it('multi box-shadow separated by commas', () => {
      const src = tagged`box-shadow: ${'0'} ${'1px'} ${'2px'} ${'red'}, ${'0'} ${'4px'} ${'8px'} ${'blue'};`;
      expect(src.ast).toEqual([
        {
          kind: NodeKind.Decl,
          prop: 'box-shadow',
          value: '\0I0\0 \0I1\0 \0I2\0 \0I3\0,\0I4\0 \0I5\0 \0I6\0 \0I7\0',
        },
      ]);
    });

    it('transition shorthand: prop dur ease', () => {
      const src = tagged`transition: ${'opacity'} ${'200ms'} ${'ease-in'};`;
      expect(src.ast).toEqual([
        {
          kind: NodeKind.Decl,
          prop: 'transition',
          value: '\0I0\0 \0I1\0 \0I2\0',
        },
      ]);
    });

    it('animation shorthand: name dur ease', () => {
      const src = tagged`animation: ${'fadeIn'} ${'1s'} ${'ease-out'};`;
      expect(src.ast).toEqual([
        {
          kind: NodeKind.Decl,
          prop: 'animation',
          value: '\0I0\0 \0I1\0 \0I2\0',
        },
      ]);
    });

    it('font shorthand with slash for line-height', () => {
      const src = tagged`font: ${'14px'}/${'1.4'} ${'system-ui'};`;
      expect(src.ast).toEqual([
        {
          kind: NodeKind.Decl,
          prop: 'font',
          value: '\0I0\0/\0I1\0 \0I2\0',
        },
      ]);
    });

    it('grid-template with slash separator', () => {
      const src = tagged`grid-template: ${'auto 1fr'} / ${'1fr 2fr'};`;
      expect(src.ast).toEqual([
        {
          kind: NodeKind.Decl,
          prop: 'grid-template',
          value: '\0I0\0 / \0I1\0',
        },
      ]);
    });

    it('background shorthand: color image position', () => {
      const src = tagged`background: ${'#fff'} ${'url(/x.png)'} ${'center'};`;
      expect(src.ast).toEqual([
        {
          kind: NodeKind.Decl,
          prop: 'background',
          value: '\0I0\0 \0I1\0 \0I2\0',
        },
      ]);
    });

    it('transform with multiple function calls', () => {
      const src = tagged`transform: translate(${'10px'}, ${'20px'}) rotate(${'45deg'});`;
      expect(src.ast).toEqual([
        {
          kind: NodeKind.Decl,
          prop: 'transform',
          value: 'translate(\0I0\0, \0I1\0) rotate(\0I2\0)',
        },
      ]);
    });

    it('calc with two operand slots', () => {
      const src = tagged`width: calc(${'100%'} - ${'2rem'});`;
      expect(src.ast).toEqual([
        {
          kind: NodeKind.Decl,
          prop: 'width',
          value: 'calc(\0I0\0 - \0I1\0)',
        },
      ]);
    });

    it('clamp with three slots', () => {
      const src = tagged`font-size: clamp(${'14px'}, ${'2vw'}, ${'24px'});`;
      expect(src.ast).toEqual([
        {
          kind: NodeKind.Decl,
          prop: 'font-size',
          value: 'clamp(\0I0\0, \0I1\0, \0I2\0)',
        },
      ]);
    });

    it('linear-gradient with direction and color stops', () => {
      const src = tagged`background: linear-gradient(${'to right'}, ${'red'}, ${'blue'});`;
      expect(src.ast).toEqual([
        {
          kind: NodeKind.Decl,
          prop: 'background',
          value: 'linear-gradient(\0I0\0, \0I1\0, \0I2\0)',
        },
      ]);
    });

    it('color-mix with slots in arms', () => {
      const src = tagged`color: color-mix(in srgb, ${'red'} 50%, ${'blue'});`;
      expect(src.ast).toEqual([
        {
          kind: NodeKind.Decl,
          prop: 'color',
          value: 'color-mix(in srgb, \0I0\0 50%, \0I1\0)',
        },
      ]);
    });

    it('multiple decls with multi-slot values do not cross-contaminate', () => {
      const src = tagged`padding: ${'8px'} ${'16px'}; margin: ${'4px'} ${'8px'};`;
      expect(src.ast).toEqual([
        { kind: NodeKind.Decl, prop: 'padding', value: '\0I0\0 \0I1\0' },
        { kind: NodeKind.Decl, prop: 'margin', value: '\0I2\0 \0I3\0' },
      ]);
    });
  });

  describe('selector-position interpolations', () => {
    it('embeds sentinel inside a selector that ends in `{`', () => {
      const otherComponent = { sentinel: true };
      const src = tagged`${otherComponent} & { color: red; }`;
      // Selector text contains `\0I0\0 &`; the sentinel passes through and the
      // compiler resolves it at fill time. No Interpolation node.
      expect(src.ast).toEqual([
        {
          kind: NodeKind.Rule,
          selectors: ['\0I0\0 &'],
          children: [{ kind: NodeKind.Decl, prop: 'color', value: 'red' }],
        },
      ]);
      expect(src.interpolations).toEqual([otherComponent]);
    });

    it('embeds sentinel inside an attribute selector', () => {
      const src = tagged`&[${'aria-pressed'}='true'] { color: red; }`;
      expect(src.ast).toEqual([
        {
          kind: NodeKind.Rule,
          selectors: [`&[\0I0\0='true']`],
          children: [{ kind: NodeKind.Decl, prop: 'color', value: 'red' }],
        },
      ]);
    });
  });

  describe('block-position interpolations', () => {
    it('emits Interpolation node when slot follows `;`', () => {
      const fn = () => 'background: blue;';
      const src = tagged`color: red; ${fn} margin: 0;`;
      expect(src.ast).toEqual([
        { kind: NodeKind.Decl, prop: 'color', value: 'red' },
        { kind: NodeKind.Interpolation, index: 0 },
        { kind: NodeKind.Decl, prop: 'margin', value: '0' },
      ]);
      expect(src.interpolations).toEqual([fn]);
    });

    it('emits Interpolation node when slot is the entire template', () => {
      const fn = () => 'color: red;';
      const src = tagged`${fn}`;
      expect(src.ast).toEqual([{ kind: NodeKind.Interpolation, index: 0 }]);
      expect(src.interpolations).toEqual([fn]);
    });

    it('emits Interpolation nodes for slots that follow `{`', () => {
      const fn = () => 'color: red;';
      const src = tagged`& { ${fn} }`;
      expect(src.ast).toEqual([
        {
          kind: NodeKind.Rule,
          selectors: ['&'],
          children: [{ kind: NodeKind.Interpolation, index: 0 }],
        },
      ]);
    });

    it('emits Interpolation nodes for slots that follow `}`', () => {
      const fn = () => 'margin: 0;';
      const src = tagged`& { color: red; } ${fn}`;
      expect(src.ast).toEqual([
        {
          kind: NodeKind.Rule,
          selectors: ['&'],
          children: [{ kind: NodeKind.Decl, prop: 'color', value: 'red' }],
        },
        { kind: NodeKind.Interpolation, index: 0 },
      ]);
    });
  });

  describe('mixed interpolations', () => {
    it('disambiguates value vs block in the same template', () => {
      const fn = () => 'background: blue;';
      const src = tagged`color: ${'red'}; ${fn} margin: 0;`;
      expect(src.ast).toEqual([
        { kind: NodeKind.Decl, prop: 'color', value: '\0I0\0' },
        { kind: NodeKind.Interpolation, index: 1 },
        { kind: NodeKind.Decl, prop: 'margin', value: '0' },
      ]);
      expect(src.interpolations).toEqual(['red', fn]);
    });

    it('treats consecutive standalone slots as siblings', () => {
      const a = () => 'color: red;';
      const b = () => 'background: blue;';
      const src = tagged`${a} ${b}`;
      expect(src.ast).toEqual([
        { kind: NodeKind.Interpolation, index: 0 },
        { kind: NodeKind.Interpolation, index: 1 },
      ]);
    });
  });
});
