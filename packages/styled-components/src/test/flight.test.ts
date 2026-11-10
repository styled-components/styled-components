import { readFlightPayload } from './flight';

/** Builds a payload from rows written as `id:json` lines, the way Flight writes its JSON rows. */
const payloadOf = (...rows: string[]): Buffer => Buffer.from(rows.map(row => `${row}\n`).join(''));

const probeProps = '{"className":"c","data-probe":"p"}';

describe('readFlightPayload', () => {
  it('finds a probe in a row after a path reference into the same row', () => {
    const result = readFlightPayload(
      payloadOf('0:["$1:0:3","$1"]', `1:[["$","div",null,${probeProps}]]`),
      []
    );

    expect(Object.keys(result.probes)).toEqual(['p']);
    expect(result.probes.p.row).toBe('1');
  });

  it('finds a probe in a row after a path reference to a whole row nested in it', () => {
    const result = readFlightPayload(
      payloadOf('0:["$1:0","$1"]', `1:[["$","div",null,${probeProps}]]`),
      []
    );

    expect(Object.keys(result.probes)).toEqual(['p']);
  });

  it('follows a row referenced twice once', () => {
    const result = readFlightPayload(
      payloadOf('0:["$1","$1"]', `1:[["$","div",null,${probeProps}]]`),
      []
    );

    expect(Object.keys(result.probes)).toEqual(['p']);
  });

  it('reads a payload whose rows reference each other in a cycle', () => {
    const result = readFlightPayload(
      payloadOf('0:["$1"]', `1:[["$","div",null,${probeProps}],"$2"]`, '2:["$1"]'),
      []
    );

    expect(Object.keys(result.probes)).toEqual(['p']);
  });

  it("reads a probe's rules from the style element before it, following references to rules and elements sent earlier", () => {
    const style =
      '["$","$L9","sc-a",{"chain":[["sc-a","b","$2",1]],"keyframes":[["k","kf",["@keyframes kf{}"]]],"outers":[]}]';
    const result = readFlightPayload(
      payloadOf(
        `0:[[${style},["$","div",null,{"className":"b","data-probe":"p"}]],["$0:0:0",["$","div",null,{"className":"b","data-probe":"q"}]]]`,
        '2:[".b{color:red;}"]'
      ),
      []
    );

    expect(
      Object.fromEntries(Object.entries(result.probes).map(([label, probe]) => [label, probe.css]))
    ).toEqual({
      p: '@keyframes kf{}.b{color:red;}',
      q: '@keyframes kf{}.b{color:red;}',
    });
  });

  it('gives a probe with no style element before it no rules', () => {
    const result = readFlightPayload(payloadOf(`0:[["$","div",null,${probeProps}]]`), []);

    expect(result.probes.p.css).toBe(null);
  });

  it('reads the rules, then the keyframes, of every global style element', () => {
    const result = readFlightPayload(
      payloadOf(
        '0:[["$","$L9","sc-global-a",{"id":"sc-global-a","keyframes":[["k","kf",["@keyframes kf{}"]]],"rules":["html{}","$1"],"seq":1}],["$","$L9","sc-global-b",{"id":"sc-global-b","keyframes":[],"rules":["body{}"],"seq":2}]]',
        '1:"a{}"'
      ),
      []
    );

    expect(result.globals).toEqual(['html{}a{}@keyframes kf{}', 'body{}']);
  });
});
