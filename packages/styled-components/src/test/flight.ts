/**
 * Real React Flight rendering for server-component tests. A test file using this
 * helper declares the `react-server` export condition in its docblock so that
 * `react` resolves to its server build and `IS_RSC` is true without mocking:
 *
 *   @jest-environment node
 *   @jest-environment-options {"customExportConditions": ["react-server", "node", "node-addons"]}
 */
import { createElement, type ReactNode } from 'react';
import { Writable } from 'stream';

type FlightServer = {
  createTemporaryReferenceSet: () => object;
  decodeReply: (
    body: string,
    manifest: object,
    options: { temporaryReferences: object }
  ) => PromiseLike<unknown>;
  registerClientReference: <T extends object>(proxy: T, id: string, name: string) => T;
  renderToPipeableStream: (
    model: ReactNode,
    manifest: object,
    options: { onError: (error: unknown) => string }
  ) => { pipe: (sink: Writable) => void };
};

const flight: FlightServer = require('react-server-dom-webpack/server.node');

/** A component Flight serializes as a reference to client code (the body never runs on the server). */
export function clientComponent<Props extends object>(name: string): (props: Props) => ReactNode {
  const proxy = (): ReactNode => {
    throw new Error(`client component "${name}" was called on the server`);
  };

  return flight.registerClientReference(proxy, `client/${name}`, 'default');
}

/** How many paragraphs {@link Filler} renders. */
export const FILLER_PARAGRAPHS = 150;

/**
 * Renders far more than the 3200 bytes after which Flight defers the remaining elements of a row,
 * so an element placed after it lands in a later row.
 */
export const Filler = (): ReactNode =>
  createElement(
    'div',
    null,
    Array.from({ length: FILLER_PARAGRAPHS }, (_, index) =>
      createElement(
        'p',
        { key: index },
        `Filler paragraph number ${index} of lorem ipsum dolor sit amet`
      )
    )
  );

/** A temporary reference as a server-action reply delivers one: a value from the client that the server can only pass back. */
export async function temporaryReference(): Promise<unknown> {
  const decoded = await flight.decodeReply(
    '{"value":"$T"}',
    {},
    {
      temporaryReferences: flight.createTemporaryReferenceSet(),
    }
  );

  return typeof decoded === 'object' && decoded !== null ? Reflect.get(decoded, 'value') : decoded;
}

/** What a probe element carried: the rule text of the style tag rendered right before it. */
export type Probe = {
  /** The probe element's whole `className`. */
  className: string;
  /** Text of the style tag rendered right before the probe element, or null when there is none. */
  css: string | null;
  /** Props of the probe element as serialized (what reached the host element). */
  props: Record<string, unknown>;
  /** Id of the payload row the probe element was serialized in ("0" is the root row). */
  row: string;
};

export type FlightResult = {
  /** Props of each client-reference element, with server output resolved inline; an element's nested client elements come before it. */
  clientProps: Record<string, unknown>[];
  /** Every error Flight reported while rendering. */
  errors: string[];
  /** Rule text of every global style tag, in payload order. */
  globals: string[];
  /** The raw payload text. */
  payload: string;
  /** Probe elements by their `data-probe` value. */
  probes: Record<string, Probe>;
};

const textDecoder = new TextDecoder();

/** Splits a payload into rows by id; text rows (`id:T<hex length>,<bytes>`) hold raw bytes, every other row is one line. */
function parseRows(payload: Buffer): Map<string, unknown> {
  const rows = new Map<string, unknown>();
  const streams = new Set<string>();
  let at = 0;

  while (at < payload.length) {
    const colon = payload.indexOf(0x3a, at);
    const id = payload.toString('utf8', at, colon);
    const tag = String.fromCharCode(payload[colon + 1]);

    if (tag === 'T') {
      const comma = payload.indexOf(0x2c, colon + 2);
      const length = parseInt(payload.toString('utf8', colon + 2, comma), 16);
      rows.set(id, textDecoder.decode(payload.subarray(comma + 1, comma + 1 + length)));
      at = comma + 1 + length;
      continue;
    }

    let end = payload.indexOf(0x0a, colon);
    if (end === -1) end = payload.length;

    if (end === colon + 1) {
      // A row id Flight reserved for a component that suspended (a lazy type) and never wrote.
    } else if (tag === 'x') {
      // An async iterable starts a row that every later row with the same id adds one yielded value to.
      streams.add(id);
      rows.set(id, []);
    } else if (!/[A-Z]/.test(tag)) {
      // Uppercase tags are control rows (debug, import, hint, timing); JSON rows start with a JSON token.
      const value = JSON.parse(payload.toString('utf8', colon + 1, end));
      const streamed = streams.has(id) ? rows.get(id) : undefined;
      if (Array.isArray(streamed)) streamed.push(value);
      else rows.set(id, value);
    }
    at = end + 1;
  }

  return rows;
}

const REFERENCE = /^\$(?:L|@)?([0-9a-f]+)((?::[0-9a-z_]+)*)$/;

type ElementModel = [string, string | null, string | null, Record<string, unknown>, ...unknown[]];

function isElementModel(value: unknown): value is ElementModel {
  return Array.isArray(value) && value[0] === '$' && typeof value[3] === 'object';
}

/** Follows every reference in the payload from the root row, collecting probes and client elements. */
function collect(
  rows: Map<string, unknown>
): Pick<FlightResult, 'clientProps' | 'globals' | 'probes'> {
  const clientProps: Record<string, unknown>[] = [];
  const globals: string[] = [];
  const probes: Record<string, Probe> = {};
  const seenRows = new Set<string>();
  const seenObjects = new WeakSet<object>();

  /** A reference is `$<row>`, optionally followed by `:key` steps into that row's value. */
  const deref = (value: unknown): { row: string; target: unknown } | undefined => {
    const match = typeof value === 'string' ? REFERENCE.exec(value) : null;
    if (!match || !rows.has(match[1])) return undefined;

    let target = rows.get(match[1]);
    for (const key of match[2].split(':').filter(Boolean)) {
      target = typeof target === 'object' && target !== null ? Reflect.get(target, key) : undefined;
    }

    return { row: match[1], target };
  };

  const visit = (value: unknown, row: string): void => {
    if (typeof value === 'string') {
      const found = deref(value);
      if (!found || (!value.includes(':') && seenRows.has(found.row))) return;
      seenRows.add(found.row);
      visit(found.target, found.row);
      return;
    }

    if (typeof value !== 'object' || value === null || seenObjects.has(value)) return;
    seenObjects.add(value);

    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        const label = isElementModel(item) ? item[3]['data-probe'] : undefined;
        if (typeof label === 'string') {
          const previous = value[index - 1];
          const before = typeof previous === 'string' ? deref(previous)?.target : previous;
          const style = isElementModel(before) && before[1] === 'style' ? before[3].children : null;
          probes[label] = {
            className: String(item[3].className),
            css: typeof style === 'string' ? style : null,
            props: item[3],
            row,
          };
        }
        if (
          isElementModel(item) &&
          item[1] === 'style' &&
          item[3]['data-styled-global'] !== undefined &&
          typeof item[3].children === 'string'
        ) {
          globals.push(item[3].children);
        }
        visit(item, row);
      });
      if (isElementModel(value) && typeof value[1] === 'string' && value[1].startsWith('$L')) {
        clientProps.push(value[3]);
      }
      return;
    }

    for (const item of Object.values(value)) visit(item, row);
  };

  visit(rows.get('0'), '0');

  return { clientProps, globals, probes };
}

/** Renders `tree` with the real Flight server and returns the probes found in the payload. */
export function renderFlight(tree: ReactNode): Promise<FlightResult> {
  return new Promise(resolve => {
    const chunks: Buffer[] = [];
    const errors: string[] = [];
    const sink = new Writable({
      write(chunk: Buffer, _encoding, done) {
        chunks.push(chunk);
        done();
      },
    });
    // Every client reference resolves to a fake bundler entry.
    const manifest = new Proxy(
      {},
      { get: (_target, key) => ({ chunks: [], id: String(key), name: 'default' }) }
    );

    sink.on('finish', () => {
      const payload = Buffer.concat(chunks);
      resolve({
        errors,
        payload: payload.toString('utf8'),
        ...collect(parseRows(payload)),
      });
    });

    flight
      .renderToPipeableStream(tree, manifest, {
        onError: error => {
          errors.push(error instanceof Error ? error.message : String(error));

          return '';
        },
      })
      .pipe(sink);
  });
}
