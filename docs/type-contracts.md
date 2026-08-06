# Type Contracts

`src/test/types.tsx` (web) and `src/test/types.native.tsx` (native) are compile-only files with no test
runner. `test:types` type-checks everything under `src` except `*.test.ts(x)`, so a new non-`.test`
file is picked up automatically. Most cases are drawn from reported issues and carry the issue number.

## Writing a case

Every `@ts-expect-error` is a test, and the compiler already enforces that each one is live: a
directive with nothing to suppress is itself an error, `TS2578 Unused '@ts-expect-error' directive`, so
`test:types` fails on a dead one with no extra tooling. Do not build a harness to re-check this; one
was written here and deleted once TS2578 was measured doing the same job.

When TS2578 fires, rewrite the assertion rather than deleting it. The behavior it described changed,
and that is worth a decision. Never delete or relax an existing directive to make a change compile;
that is the change being wrong, not the test.

TS2578 proves a directive suppresses *something*, not that it suppresses the *right* thing. A
directive can go on passing for a reason its comment does not describe: an assertion here about
arbitrary CSS being rejected kept passing only because a required field was missing. Name the expected
error in the comment, and when editing a case, re-read what it actually catches.

A case asserting a type did not widen to `any` needs a presence anchor, since `any` compiles clean.
Write a deliberate mismatch under `@ts-expect-error` so the widening surfaces as TS2578. The same
applies to a union: a transform that widened props to an index signature accepts everything, so pair
each accepted prop with a rejected one.

Never annotate a callback parameter whose inference is the thing under test. An annotation makes the
case pass whether or not inference works.

A `DefaultTheme` augmentation in a contract suite uses optional keys only. The library defaults the
theme to `EMPTY_OBJECT` internally, so a required key fails the library's own source rather than the
test file. Read through `NonNullable<...>` where a non-optional view is needed.

## Reading the output

`tsc` emits semantic diagnostics only when there are zero syntactic ones, so a single syntax error in a
contract suite blanks the entire type check and the file reads as "clean except one typo". Fix any
syntax error first, then re-read the output before believing a pass.

## Third-party shapes

Third-party shapes are hand-written stubs, such as Mantine's polymorphic factory and Next.js `Link`'s
`Url`. Annotate a stub with the package version it was verified against, and pin its premise with an
assertion where the stub's whole point is a property of the real type: the Mantine stub asserts its
resolved props have no keys, so the case cannot pass against a stub that became introspectable. Do not
add the real package as a dependency to test a type.

## Verified out of tree

Four reported issues cannot be pinned in-tree, because each is a union-explosion or recursion-depth
cliff that a simplified stub sits clear of and would pass vacuously:

- antd's `Button` under `.attrs()` (#5725)
- react-bootstrap 2.8's `Button` (#4166)
- react-spring's `animated` with the `css` prop (#3496)
- preact/compat (#3773)

They are verified out of tree against the real packages at the versions reported. Re-verify them by
hand when the polymorphic call signature or `Interpolation` changes.
