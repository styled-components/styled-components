# Profiling

Bun records a CPU profile and emits a markdown report (`--cpu-prof-md`: hot functions, per-file time, call relationships, grep- and review-friendly). `--cpu-prof` adds Chrome's JSON for the same run. From `packages/styled-components` (add `--cpu-prof-dir=./.cpu-profiles` to keep artifacts out of the tree; that directory is gitignored):

- In-house web parser: `bun --cpu-prof --cpu-prof-md --cpu-prof-name=parser-profile --cpu-prof-dir=./.cpu-profiles src/parser/profile-harness.ts`
- Native pipeline: `bun --cpu-prof --cpu-prof-md --cpu-prof-name=native-profile --cpu-prof-dir=./.cpu-profiles src/native/profile-pipeline.ts`
- Color polyfill only (skips transformDecl orchestration; pre-tokenizes operands so the profile is dominated by polyfill self-time): `bun --cpu-prof --cpu-prof-md --cpu-prof-name=color-polyfill --cpu-prof-dir=./.cpu-profiles src/native/profile-color-polyfill.ts`
- Animation only (per-segment color + value interpolation build + hot helpers): `bun --cpu-prof --cpu-prof-md --cpu-prof-name=animation --cpu-prof-dir=./.cpu-profiles src/native/profile-animation.ts`

`--cpu-prof-name` sets the output basename. If you omit `--cpu-prof-dir`, files are written in the current directory (Bun may use a name without a `.md` extension even for markdown content; the file is still markdown).

On-device motion debugging: `setAnimationDebug('timeline')` (public export) logs scroll-timeline attach outcomes and sticky twin events, one `[sc/anim]` line per scroller; pass `true` for the full per-render adapter trace (very chatty). The showcase enables the quiet scope in dev builds. Keep debug channels scoped like this: one line per event, never dump host instances or props objects.
