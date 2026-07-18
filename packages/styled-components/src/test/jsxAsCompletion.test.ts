import * as path from 'path';
import * as ts from 'typescript';

/**
 * Regression test for editor JSX attribute autocompletion on polymorphic
 * components (PolymorphicComponent single call signature). Drives the same
 * TypeScript language service an editor uses (`getCompletionsAtPosition`) against
 * the library source, so a change that silently breaks `as`-target completion
 * fails here. The `as="video"` case fails on the pre-fix three-overload form and
 * passes with the single-signature typing.
 */

const pkgRoot = path.resolve(__dirname, '..', '..');
const probeFile = path.resolve(__dirname, '__as_completion_probe__.tsx');

/** Return the completion entry names offered at the `/*|*\/` marker in `source`. */
function completionsAt(source: string): Set<string> {
  const offset = source.indexOf('/*|*/');
  if (offset < 0) throw new Error('completion probe source is missing its /*|*/ marker');
  const text = source.replace('/*|*/', '');

  const options: ts.CompilerOptions = {
    strict: true,
    exactOptionalPropertyTypes: true,
    skipLibCheck: true,
    jsx: ts.JsxEmit.ReactJSX,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    target: ts.ScriptTarget.ES2020,
    lib: ['lib.es2021.d.ts', 'lib.dom.d.ts'],
  };

  const host: ts.LanguageServiceHost = {
    getScriptFileNames: () => [probeFile],
    getScriptVersion: () => '1',
    getScriptSnapshot: fileName => {
      if (fileName === probeFile) return ts.ScriptSnapshot.fromString(text);
      if (!ts.sys.fileExists(fileName)) return undefined;
      return ts.ScriptSnapshot.fromString(ts.sys.readFile(fileName)!);
    },
    getCurrentDirectory: () => pkgRoot,
    getCompilationSettings: () => options,
    getDefaultLibFileName: opts => ts.getDefaultLibFilePath(opts),
    fileExists: ts.sys.fileExists,
    readFile: ts.sys.readFile,
    readDirectory: ts.sys.readDirectory,
    directoryExists: ts.sys.directoryExists,
    getDirectories: ts.sys.getDirectories,
    realpath: ts.sys.realpath,
  };

  const service = ts.createLanguageService(host, ts.createDocumentRegistry());
  const info = service.getCompletionsAtPosition(probeFile, offset, {});
  return new Set((info?.entries ?? []).map(entry => entry.name));
}

const importStyled = `import styled from '../index-standalone';\n`;
const styledDiv = `const Box = styled.div<{ $active?: boolean; $count: number }>\`\`;\n`;

describe('polymorphic JSX attribute completion', () => {
  it('offers the as target’s own attributes while an attribute name is mid-typed', () => {
    const names = completionsAt(
      `${importStyled}${styledDiv}const el = <Box as="video" lo/*|*/ />;`
    );

    // video-only attributes, reachable only when `as="video"` is honored
    expect(names.has('loop')).toBe(true);
    expect(names.has('muted')).toBe(true);
    expect(names.has('controls')).toBe(true);
  });

  it('offers the as target’s attributes with no partial typed', () => {
    const names = completionsAt(`${importStyled}${styledDiv}const el = <Box as="video" /*|*/ />;`);

    expect(names.has('loop')).toBe(true);
    expect(names.has('poster')).toBe(true);
  });

  it('still completes the component’s own props for plain usage', () => {
    const names = completionsAt(`${importStyled}${styledDiv}const el = <Box $/*|*/ />;`);

    expect(names.has('$active')).toBe(true);
    expect(names.has('$count')).toBe(true);
  });
});
