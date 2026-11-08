'use client';

import { useRef, useState, useSyncExternalStore } from 'react';
import { flushSync } from 'react-dom';
import styled, { createGlobalStyle, keyframes } from 'styled-components';
import { type TestCheck } from '../components/auto-test';
import { TestSummary } from '../components/test-summary';
import theme from '../lib/theme';

const CARD_GROUP_MS = 400;
const FEATURED_GROUP_MS = 900;
const GROUP_PSEUDO = '::view-transition-group';

interface Item {
  featured: boolean;
  id: number;
  label: string;
}

const INITIAL_ITEMS: Item[] = [
  { featured: false, id: 1, label: 'Alpha' },
  { featured: true, id: 2, label: 'Bravo' },
  { featured: false, id: 3, label: 'Charlie' },
  { featured: false, id: 4, label: 'Delta' },
  { featured: true, id: 5, label: 'Echo' },
];

const INITIAL_CHIPS = ['One', 'Two', 'Three'];

type CheckStatus = 'fail' | 'pass' | 'unsupported';

interface DynamicResult {
  detail: string;
  label: string;
  status: CheckStatus;
}

/** Runs `update` inside a view transition when the browser has one, else applies it directly. */
function transition(update: () => void): ViewTransition | null {
  if (!('startViewTransition' in document)) {
    update();
    return null;
  }

  return document.startViewTransition(() => {
    flushSync(update);
  });
}

function shuffled<T>(list: readonly T[]): T[] {
  const out = list.slice();

  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }

  // A shuffle that lands on the same order shows nothing; rotate so something always moves.
  const same = out.every((value, index) => value === list[index]);
  return same && out.length > 1 ? out.slice(1).concat(out[0]) : out;
}

const subscribeNever = () => () => {};
const supportSnapshot = () =>
  'startViewTransition' in document && CSS.supports('view-transition-class', 'x');

export function ViewTransitionsHarness() {
  const supported = useSyncExternalStore(subscribeNever, supportSnapshot, () => null);
  const [items, setItems] = useState(INITIAL_ITEMS);
  const [chips, setChips] = useState(INITIAL_CHIPS);
  const [results, setResults] = useState<DynamicResult[] | null>(null);
  const nextId = useRef(INITIAL_ITEMS.length + 1);

  const reverse = () => transition(() => setItems(prev => prev.slice().reverse()));
  const shuffle = () => transition(() => setItems(prev => shuffled(prev)));

  const add = () => {
    const id = nextId.current++;
    transition(() => setItems(prev => prev.concat({ featured: false, id, label: `New ${id}` })));
  };

  const remove = () => transition(() => setItems(prev => prev.slice(0, -1)));

  const runChecks = async () => {
    if (!supported) {
      setResults([
        {
          detail: 'view transitions or view-transition-class are missing in this browser',
          label: 'Group durations',
          status: 'unsupported',
        },
      ]);
      return;
    }

    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setResults([
        {
          detail: 'prefers-reduced-motion: reduce turns the animation rules off',
          label: 'Group durations',
          status: 'unsupported',
        },
      ]);
      return;
    }

    const run = transition(() => setItems(prev => prev.slice().reverse()));
    if (!run) return;

    await run.ready;

    const durations = document
      .getAnimations()
      .filter(a => {
        const effect = a.effect;
        return effect instanceof KeyframeEffect && effect.pseudoElement?.startsWith(GROUP_PSEUDO);
      })
      .map(a => Number(a.effect?.getTiming().duration));
    const observed = durations.length ? durations.join(', ') : '(no group animations)';

    setResults(
      [CARD_GROUP_MS, FEATURED_GROUP_MS].map(ms => ({
        detail: `observed durations (ms): ${observed}`,
        label: `A group animates for ${ms}ms (${ms === CARD_GROUP_MS ? 'Card' : 'Featured'})`,
        status: durations.includes(ms) ? 'pass' : 'fail',
      }))
    );

    await run.finished;
  };

  return (
    <>
      <Transitions />

      <Demo>
        <DemoTitle>Self-check</DemoTitle>
        <DemoNote>
          The checks read the computed <code>view-transition-class</code> of a Card, a Featured card
          (both classes), and the value-form chip, whose value must carry no leading dot. &quot;Run
          checks&quot; reverses the list and reads the real group animations: the Card group should
          take {CARD_GROUP_MS}ms and the Featured group {FEATURED_GROUP_MS}ms.
        </DemoNote>
        {supported === false && (
          <Unsupported role="status">
            Not supported in this browser: it lacks <code>document.startViewTransition</code> or{' '}
            <code>view-transition-class</code>. The demos below still update, without animation.
          </Unsupported>
        )}
        {supported && <TestSummary suites={SUITES} />}
        <Controls>
          <Button type="button" onClick={runChecks}>
            Run checks
          </Button>
        </Controls>
        {results && (
          <ResultList>
            {results.map(r => (
              <ResultRow key={r.label}>
                <Badge $status={r.status}>{r.status}</Badge>
                <span>
                  {r.label} <ResultDetail>{r.detail}</ResultDetail>
                </span>
              </ResultRow>
            ))}
          </ResultList>
        )}
      </Demo>

      <Demo>
        <DemoTitle>
          <DemoNum>1.</DemoNum> Reorder: every Card shares one group rule
        </DemoTitle>
        <DemoNote>
          Plain cards move over {CARD_GROUP_MS}ms. The rule targets the component, not a name:
        </DemoNote>
        <Snippet>{CARD_SNIPPET}</Snippet>
        <Controls>
          <Button type="button" onClick={shuffle}>
            Shuffle
          </Button>
          <Button type="button" onClick={reverse}>
            Reverse
          </Button>
        </Controls>
        <CardList data-testid="vt-list">
          {items.map(item =>
            item.featured ? (
              <Featured key={item.id} data-testid={`vt-featured-${item.label}`}>
                {item.label} <Tag>Featured, {FEATURED_GROUP_MS}ms</Tag>
              </Featured>
            ) : (
              <Card key={item.id} data-testid={`vt-card-${item.label}`}>
                {item.label} <Tag>Card, {CARD_GROUP_MS}ms</Tag>
              </Card>
            )
          )}
        </CardList>
      </Demo>

      <Demo>
        <DemoTitle>
          <DemoNum>2.</DemoNum> Extension: <code>styled(Card)</code> with its own rule
        </DemoTitle>
        <DemoNote>
          The accent cards above are <code>Featured</code>. It sets its own{' '}
          <code>view-transition-name</code>, so it gets its own class beside Card&apos;s, and moves
          over {FEATURED_GROUP_MS}ms while plain cards finish in {CARD_GROUP_MS}ms. Press Reverse in
          section 1 and watch the two speeds.
        </DemoNote>
        <Snippet>{FEATURED_SNIPPET}</Snippet>
      </Demo>

      <Demo>
        <DemoTitle>
          <DemoNum>3.</DemoNum> Enter and exit
        </DemoTitle>
        <DemoNote>
          Add grows a new Card in with a scale and fade; Remove shrinks the last one out. Both use{' '}
          <code>:only-child</code> on the new and old pseudo-elements. Use the list in section 1.
        </DemoNote>
        <Snippet>{ENTER_SNIPPET}</Snippet>
        <Controls>
          <Button type="button" onClick={add}>
            Add
          </Button>
          <Button type="button" onClick={remove} disabled={items.length === 0}>
            Remove
          </Button>
        </Controls>
      </Demo>

      <Demo>
        <DemoTitle>
          <DemoNum>4.</DemoNum> Value form: <code>view-transition-class: {'${Card}'}</code>
        </DemoTitle>
        <DemoNote>
          The chips write the class explicitly, so they join the Card rules and move over{' '}
          {CARD_GROUP_MS}ms even though they are not Cards.
        </DemoNote>
        <Snippet>{VALUE_SNIPPET}</Snippet>
        <Controls>
          <Button
            type="button"
            onClick={() => transition(() => setChips(prev => prev.slice().reverse()))}
          >
            Reverse chips
          </Button>
        </Controls>
        <ChipRow>
          {chips.map(chip => (
            <Chip key={chip} data-testid={`vt-chip-${chip}`}>
              {chip}
            </Chip>
          ))}
        </ChipRow>
      </Demo>

      <Demo>
        <DemoTitle>
          <DemoNum>5.</DemoNum> Reduced motion
        </DemoTitle>
        <DemoNote>
          The rules above apply only under <code>prefers-reduced-motion: no-preference</code>. With{' '}
          <code>reduce</code>, every view transition animation is off, so the list jumps without
          motion.
        </DemoNote>
        <Snippet>{REDUCED_SNIPPET}</Snippet>
      </Demo>
    </>
  );
}

const enter = keyframes`
  from { opacity: 0; transform: scale(0.2); }
  to { opacity: 1; transform: scale(1); }
`;

const exit = keyframes`
  from { opacity: 1; transform: scale(1); }
  to { opacity: 0; transform: scale(0.2); }
`;

const Card = styled.li`
  view-transition-name: match-element;
  list-style: none;
  padding: 14px 18px;
  border: 2px solid var(--sc-colors-border);
  border-radius: 8px;
  background: var(--sc-colors-surface);
  color: var(--sc-colors-text);
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`;

const Featured = styled(Card)`
  view-transition-name: match-element;
  border-color: var(--sc-colors-accent);
  border-width: 3px;
  padding-block: 22px;
`;

const Chip = styled.div`
  view-transition-name: match-element;
  view-transition-class: ${Card};
  padding: 10px 22px;
  border-radius: 999px;
  border: 2px dashed var(--sc-colors-accent);
  color: var(--sc-colors-text);
  font-weight: 700;
`;

/*
 * One sheet holds the Card and Featured rules: both match a Featured element (equal
 * specificity), so Featured's rule has to come last to win. The reduce block can't simply
 * override them: `:only-child` outranks it, so the animated rules sit behind no-preference.
 */
const Transitions = createGlobalStyle`
  @media (prefers-reduced-motion: no-preference) {
    ::view-transition-group(*${Card}) {
      animation-duration: ${CARD_GROUP_MS}ms;
      animation-timing-function: cubic-bezier(0.2, 0.9, 0.2, 1);
    }

    ::view-transition-group(*${Featured}) {
      animation-duration: ${FEATURED_GROUP_MS}ms;
      animation-timing-function: ease-in-out;
    }

    ::view-transition-new(*${Card}):only-child {
      animation: ${enter} 600ms cubic-bezier(0.2, 0.9, 0.2, 1) both;
    }

    ::view-transition-old(*${Card}):only-child {
      animation: ${exit} 600ms ease-in both;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    ::view-transition-group(*),
    ::view-transition-old(*),
    ::view-transition-new(*) {
      animation: none;
    }
  }
`;

const CARD_SNIPPET = `const Card = styled.li\`
  view-transition-name: match-element;
\`;

const Transitions = createGlobalStyle\`
  ::view-transition-group(*\${Card}) {
    animation-duration: 400ms;
  }
\`;`;

const FEATURED_SNIPPET = `const Featured = styled(Card)\`
  view-transition-name: match-element;
\`;

// Written after the Card rule: both match a Featured card, the later one wins.
createGlobalStyle\`
  ::view-transition-group(*\${Featured}) {
    animation-duration: 900ms;
  }
\`;`;

const ENTER_SNIPPET = `::view-transition-new(*\${Card}):only-child {
  animation: \${enter} 600ms both;
}
::view-transition-old(*\${Card}):only-child {
  animation: \${exit} 600ms both;
}`;

const VALUE_SNIPPET = `const Chip = styled.div\`
  view-transition-name: match-element;
  view-transition-class: \${Card};
\`;`;

const REDUCED_SNIPPET = `@media (prefers-reduced-motion: no-preference) {
  /* every rule above */
}

@media (prefers-reduced-motion: reduce) {
  ::view-transition-group(*),
  ::view-transition-old(*),
  ::view-transition-new(*) {
    animation: none;
  }
}`;

const CLASS_PROP = 'view-transition-class';

const SUITES: { checks: TestCheck[]; name: string }[] = [
  {
    checks: [
      {
        expected: Card.styledComponentId,
        label: 'Card has its own class as view-transition-class',
        prop: CLASS_PROP,
        ref: 'vt-card-Alpha',
        type: 'style',
      },
      {
        expected: Card.styledComponentId,
        label: 'Featured keeps the Card class',
        prop: CLASS_PROP,
        ref: 'vt-featured-Bravo',
        type: 'style',
      },
      {
        expected: Featured.styledComponentId,
        label: 'Featured adds its own class',
        prop: CLASS_PROP,
        ref: 'vt-featured-Bravo',
        type: 'style',
      },
      {
        expected: Card.styledComponentId,
        label: 'the value-form chip carries the Card class',
        prop: CLASS_PROP,
        ref: 'vt-chip-One',
        type: 'style',
      },
      {
        expected: `.${Card.styledComponentId}`,
        label: 'the value-form chip has no leading dot',
        prop: CLASS_PROP,
        ref: 'vt-chip-One',
        type: 'style-not',
      },
    ],
    name: 'view-transition-class',
  },
];

const Demo = styled.section`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const DemoTitle = styled.h2`
  font-size: 17px;
  font-weight: 600;
  margin: 0;
  letter-spacing: -0.01em;

  code {
    font-family: ${theme.typography.fontFamilyMono};
    font-size: 0.92em;
    color: var(--sc-colors-accent);
    background: none;
  }
`;

const DemoNum = styled.span`
  font-family: ${theme.typography.fontFamilyMono};
  font-weight: 700;
  color: var(--sc-colors-textMuted);
  margin-right: 8px;
`;

const DemoNote = styled.p`
  margin: 0;
  font-size: 13.5px;
  line-height: 1.55;
  color: var(--sc-colors-textMuted);
  max-width: 70ch;

  code {
    font-family: ${theme.typography.fontFamilyMono};
    font-size: 0.92em;
    background: var(--sc-colors-surface);
    border: 1px solid var(--sc-colors-border);
    padding: 0 4px;
    border-radius: 3px;
    color: var(--sc-colors-text);
  }
`;

const Snippet = styled.pre`
  margin: 0;
  padding: 12px 14px;
  font-family: ${theme.typography.fontFamilyMono};
  font-size: 12px;
  line-height: 1.5;
  background: var(--sc-colors-surface);
  border: 1px solid var(--sc-colors-border);
  border-radius: 6px;
  color: var(--sc-colors-text);
  overflow-x: auto;
`;

const Controls = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const Button = styled.button`
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  background: var(--sc-colors-surface);
  border: 1px solid var(--sc-colors-border);
  color: var(--sc-colors-text);
  cursor: pointer;

  &:hover:not(:disabled) {
    border-color: var(--sc-colors-primary);
    color: var(--sc-colors-primary);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const CardList = styled.ul`
  margin: 4px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 420px;
`;

const ChipRow = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
`;

const Tag = styled.span`
  font-family: ${theme.typography.fontFamilyMono};
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--sc-colors-textMuted);
`;

const Unsupported = styled.p`
  margin: 0;
  padding: 10px 14px;
  font-size: 13.5px;
  border: 2px solid #b45309;
  border-radius: 6px;
  color: var(--sc-colors-text);
  background: var(--sc-colors-surface);

  code {
    font-family: ${theme.typography.fontFamilyMono};
  }
`;

const ResultList = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
`;

const ResultRow = styled.li`
  display: flex;
  gap: 10px;
  align-items: baseline;
`;

const ResultDetail = styled.span`
  font-family: ${theme.typography.fontFamilyMono};
  font-size: 11px;
  color: var(--sc-colors-textMuted);
`;

const Badge = styled.span<{ $status: CheckStatus }>`
  font-family: ${theme.typography.fontFamilyMono};
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 2px 8px;
  border-radius: 999px;
  color: white;
  background: ${p => (p.$status === 'pass' ? '#16a34a' : p.$status === 'fail' ? '#dc2626' : '#6b7280')};
`;
