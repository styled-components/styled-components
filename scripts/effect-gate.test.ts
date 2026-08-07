/**
 * The `useInsertionEffect` allowlist has to agree with the source.
 *
 * `.biome/no-insertion-effect.grit` bans the hook everywhere the linter
 * looks, and `biome.jsonc` carves out the files that write to the
 * stylesheet. Biome enforces one direction: a file that uses the hook
 * without being carved out fails the build. It cannot enforce the other,
 * because a glob that matches nothing is not an error, so a renamed file
 * or a moved injection leaves a carve-out standing that now sanctions a
 * file with no business using the hook.
 *
 * This is the other direction. The set of files that write to the sheet
 * is one fact; the allowlist is a second copy of it, and this is what
 * keeps the copy honest.
 */

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import test from 'node:test';

const ROOT = resolve(import.meta.dirname, '..');
const SRC = join(ROOT, 'packages/styled-components/src');

/**
 * Blank out `//` line comments so `JSON.parse` accepts biome.jsonc.
 * A character loop rather than a pattern because `"$schema"`'s value
 * contains `//` inside a string, which is exactly what a naive pattern
 * gets wrong. Only line comments are handled; the config uses no block
 * comments, and one would fail loudly at `JSON.parse` rather than
 * quietly changing the parsed result.
 */
function stripLineComments(text: string): string {
  let out = '';
  let inString = false;
  let inComment = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inComment) {
      if (c === '\n') {
        inComment = false;
        out += c;
      }
      continue;
    }
    if (inString) {
      out += c;
      if (c === '\\') {
        out += text[++i] ?? '';
      } else if (c === '"') {
        inString = false;
      }
      continue;
    }
    if (c === '"') {
      inString = true;
      out += c;
    } else if (c === '/' && text[i + 1] === '/') {
      inComment = true;
      i++;
    } else {
      out += c;
    }
  }
  return out;
}

/** Source files the linter sees, i.e. excluding the test carve-out that
 *  both plugin entries already make. */
function sourceFiles(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'test') continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) sourceFiles(path, found);
    else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) found.push(path);
  }
  return found;
}

test('the useInsertionEffect allowlist names exactly the files that write to the stylesheet', () => {
  const users = sourceFiles(SRC)
    .filter(path => readFileSync(path, 'utf8').includes('useInsertionEffect('))
    .map(path => relative(ROOT, path))
    .sort();

  const config = JSON.parse(stripLineComments(readFileSync(join(ROOT, 'biome.jsonc'), 'utf8')));
  const entry = config.plugins.find((p: { path: string }) =>
    p.path.endsWith('no-insertion-effect.grit')
  );
  assert.ok(entry, 'biome.jsonc registers no no-insertion-effect plugin entry');

  const allowed: string[] = entry.includes
    .filter((glob: string) => glob.startsWith('!**/') && !glob.includes('test'))
    .map((glob: string) => glob.slice('!**/'.length));

  // Control: an empty comparison on either side would pass vacuously, and
  // both sides are derived, so both can go empty at once.
  assert.ok(users.length > 0, 'found no file using useInsertionEffect; the scan is broken');

  assert.deepEqual(
    allowed
      .map(suffix => users.find(path => path.endsWith(suffix)) ?? `UNMATCHED: ${suffix}`)
      .sort(),
    users,
    'biome.jsonc’s useInsertionEffect carve-outs and the files actually using the hook have drifted apart'
  );
});
