'use client';

import Link from 'next/link';
import { useCallback, useRef, useState } from 'react';
import type { ScenarioRoute } from './routes';

interface ProbeReading {
  actual: string;
  expected: string;
  label: string;
  pass: boolean;
  property: string;
}

type CardState =
  | { kind: 'cost' }
  | { kind: 'loading' }
  | { kind: 'done'; pass: boolean; probes: ProbeReading[] };

const COLOR_NAMES: Record<string, string> = {
  'rgb(0, 0, 255)': 'blue',
  'rgb(0, 128, 0)': 'green',
  'rgb(128, 0, 128)': 'purple',
  'rgb(255, 0, 0)': 'red',
};

const shortColor = (value: string) => COLOR_NAMES[value] ?? value;

const PREVIEW_STYLE_ATTR = 'data-preview-chrome';

const PREVIEW_CHROME_CSS = [
  'nav, [data-scenario] > h1, [data-scenario] > p, nextjs-portal { display: none !important; }',
  'html, body { background: #ffffff !important; color: #111827 !important; margin: 0 !important; padding: 0 !important; }',
  'body > div { padding: 0 !important; overflow: hidden !important; }',
  '[data-scenario] { gap: 6px !important; max-width: none !important; }',
  '[data-scenario-surface] { border: none !important; border-radius: 0 !important; padding: 10px 12px !important; }',
].join('\n');

/**
 * Hides the sandbox sidebar, top scenario bar, heading, and Next dev portal inside the preview
 * iframe via a head stylesheet so React-owned inline styles are never mutated during hydration.
 */
function stripChrome(doc: Document): number {
  if (!doc.head.querySelector(`style[${PREVIEW_STYLE_ATTR}]`)) {
    const style = doc.createElement('style');
    style.setAttribute(PREVIEW_STYLE_ATTR, '');
    style.textContent = PREVIEW_CHROME_CSS;
    doc.head.appendChild(style);
  }

  const section = doc.querySelector<HTMLElement>('[data-scenario]');
  if (!section) return 56;

  return Math.min(Math.max(Math.ceil(section.scrollHeight), 48), 220);
}

function readProbes(doc: Document, win: Window): { loading: boolean; probes: ProbeReading[] } {
  const section = doc.querySelector<HTMLElement>('[data-scenario]');
  const text = section?.textContent ?? '';
  const loading = /\bloading\b/i.test(text);
  const nodes = doc.querySelectorAll<HTMLElement>('[data-expected]');
  const probes: ProbeReading[] = [];

  for (const node of nodes) {
    const expected = node.getAttribute('data-expected') ?? '';
    const property = node.getAttribute('data-expected-property') ?? 'color';
    const actual = win.getComputedStyle(node).getPropertyValue(property).trim();
    const label =
      node.getAttribute('data-testid') ?? node.textContent?.trim().slice(0, 24) ?? 'probe';

    probes.push({
      actual,
      expected,
      label,
      pass: actual === expected,
      property,
    });
  }

  return { loading, probes };
}

function ScenarioCard({
  onStatus,
  route,
}: {
  onStatus: (href: string, state: CardState) => void;
  route: ScenarioRoute;
}) {
  const [state, setState] = useState<CardState>(() =>
    route.noProbes ? { kind: 'cost' } : { kind: 'loading' }
  );
  const [frameHeight, setFrameHeight] = useState(72);
  const [ready, setReady] = useState(false);
  const [showCostPreview, setShowCostPreview] = useState(false);
  const observerRef = useRef<MutationObserver | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cleanup = useCallback(() => {
    observerRef.current?.disconnect();
    observerRef.current = null;
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const attachFrame = useCallback(
    (iframe: HTMLIFrameElement | null) => {
      if (iframe === null) {
        cleanup();
        return;
      }

      const inspect = () => {
        if (timerRef.current !== null) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }

        const doc = iframe.contentDocument;
        const win = iframe.contentWindow;
        if (!doc || !win || !doc.body) return;

        const height = stripChrome(doc);
        setFrameHeight(height);
        setReady(true);

        if (route.noProbes) return;

        const { loading, probes } = readProbes(doc, win);
        if (loading || probes.length === 0) {
          timerRef.current = setTimeout(inspect, 200);
          return;
        }

        const pass = probes.every(probe => probe.pass);
        const next: CardState = { kind: 'done', pass, probes };
        setState(next);
        onStatus(route.href, next);
      };

      const onLoad = () => {
        cleanup();
        inspect();
        const doc = iframe.contentDocument;
        if (doc?.body) {
          const observer = new MutationObserver(() => {
            inspect();
          });
          observer.observe(doc.body, { childList: true, subtree: true });
          observerRef.current = observer;
        }
      };

      iframe.addEventListener('load', onLoad);
      if (
        iframe.contentDocument?.readyState === 'complete' &&
        iframe.contentDocument.body?.children.length
      ) {
        onLoad();
      }

      return () => {
        iframe.removeEventListener('load', onLoad);
        cleanup();
      };
    },
    [cleanup, onStatus, route.href, route.noProbes]
  );

  const badge =
    state.kind === 'cost'
      ? { bg: 'rgba(156, 163, 175, 0.16)', color: 'var(--sc-colors-textMuted)', text: 'COST' }
      : state.kind === 'loading'
        ? { bg: 'rgba(245, 158, 11, 0.16)', color: 'var(--sc-colors-warning)', text: 'LOADING' }
        : state.pass
          ? { bg: 'rgba(34, 197, 94, 0.16)', color: 'var(--sc-colors-success)', text: 'PASS' }
          : { bg: 'rgba(239, 68, 68, 0.18)', color: 'var(--sc-colors-danger)', text: 'FAIL' };

  return (
    <li
      style={{
        background: 'var(--sc-colors-surface)',
        border: '1px solid var(--sc-colors-border)',
        borderRadius: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        padding: 14,
      }}
    >
      <div
        style={{
          alignItems: 'center',
          display: 'flex',
          gap: 8,
          justifyContent: 'space-between',
        }}
      >
        <div
          style={{ alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: 8, minWidth: 0 }}
        >
          <Link
            href={`/scenarios/${route.href}`}
            style={{
              color: 'var(--sc-colors-text)',
              fontSize: 15,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            {route.href}
          </Link>
          <span
            style={{
              background: 'var(--sc-colors-background)',
              border: '1px solid var(--sc-colors-border)',
              borderRadius: 5,
              color: 'var(--sc-colors-textMuted)',
              fontFamily: 'var(--sc-typography-fontFamilyMono, ui-monospace, monospace)',
              fontSize: 11,
              padding: '1px 6px',
            }}
          >
            {route.rows}
          </span>
        </div>
        <span
          style={{
            background: badge.bg,
            borderRadius: 999,
            color: badge.color,
            flexShrink: 0,
            fontFamily: 'var(--sc-typography-fontFamilyMono, ui-monospace, monospace)',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.04em',
            padding: '2px 8px',
          }}
        >
          {badge.text}
        </span>
      </div>

      <p style={{ color: 'var(--sc-colors-textMuted)', fontSize: 13, lineHeight: 1.4, margin: 0 }}>
        {route.what}
      </p>

      {route.noProbes && !showCostPreview ? (
        <div
          style={{
            alignItems: 'center',
            background: 'var(--sc-colors-background)',
            border: '1px dashed var(--sc-colors-border)',
            borderRadius: 8,
            color: 'var(--sc-colors-textMuted)',
            display: 'flex',
            fontSize: 12.5,
            justifyContent: 'space-between',
            padding: '10px 12px',
          }}
        >
          <span>5,000 server-rendered elements (deferred on index)</span>
          <button
            type="button"
            onClick={() => setShowCostPreview(true)}
            style={{
              background: 'var(--sc-colors-surface)',
              border: '1px solid var(--sc-colors-border)',
              borderRadius: 6,
              color: 'var(--sc-colors-text)',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600,
              padding: '4px 10px',
            }}
          >
            Load preview
          </button>
        </div>
      ) : (
        <div
          style={{
            background: '#ffffff',
            border: '1px solid var(--sc-colors-border)',
            borderRadius: 8,
            minHeight: 52,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {!ready && (
            <div
              style={{
                color: '#6b7280',
                fontSize: 12,
                padding: '14px 12px',
              }}
            >
              Rendering isolated preview...
            </div>
          )}
          <iframe
            ref={attachFrame}
            src={`/scenarios/${route.href}`}
            loading="lazy"
            title={`Preview of ${route.href}`}
            style={{
              background: '#ffffff',
              border: 0,
              display: 'block',
              height: frameHeight,
              opacity: ready ? 1 : 0,
              position: ready ? 'static' : 'absolute',
              transition: 'opacity 120ms ease',
              width: '100%',
            }}
          />
        </div>
      )}

      {state.kind === 'done' && state.probes.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {state.probes.map(probe => (
            <span
              key={`${probe.label}-${probe.property}`}
              title={`${probe.property}: actual ${probe.actual}, expected ${probe.expected}`}
              style={{
                alignItems: 'center',
                background: 'var(--sc-colors-background)',
                border: `1px solid ${probe.pass ? 'var(--sc-colors-border)' : 'var(--sc-colors-danger)'}`,
                borderRadius: 6,
                color: 'var(--sc-colors-textMuted)',
                display: 'inline-flex',
                fontFamily: 'var(--sc-typography-fontFamilyMono, ui-monospace, monospace)',
                fontSize: 11,
                gap: 6,
                padding: '2px 7px',
              }}
            >
              <span
                style={{
                  background: probe.actual,
                  border: '1px solid rgba(128,128,128,0.4)',
                  borderRadius: '50%',
                  display: 'inline-block',
                  height: 9,
                  width: 9,
                }}
              />
              <span style={{ color: 'var(--sc-colors-text)' }}>{probe.label}</span>
              <span>
                {shortColor(probe.actual)}
                {probe.pass ? '' : ` != ${shortColor(probe.expected)}`}
              </span>
            </span>
          ))}
        </div>
      )}
    </li>
  );
}

export function ScenarioGallery({ routes }: { routes: readonly ScenarioRoute[] }) {
  const [statuses, setStatuses] = useState<Record<string, boolean>>({});
  const probeTotal = routes.filter(route => !route.noProbes).length;

  const onStatus = useCallback((href: string, state: CardState) => {
    if (state.kind !== 'done') return;
    setStatuses(prev => (prev[href] === state.pass ? prev : { ...prev, [href]: state.pass }));
  }, []);

  const settled = Object.values(statuses);
  const passed = settled.filter(Boolean).length;
  const failed = settled.length - passed;

  return (
    <div>
      <div
        style={{
          alignItems: 'baseline',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          justifyContent: 'space-between',
          marginBottom: 8,
        }}
      >
        <h1 style={{ color: 'var(--sc-colors-text)', fontSize: 24, margin: 0 }}>
          Style order scenarios
        </h1>
        <span
          style={{
            background:
              failed > 0
                ? 'rgba(239, 68, 68, 0.16)'
                : passed === probeTotal
                  ? 'rgba(34, 197, 94, 0.16)'
                  : 'var(--sc-colors-surface)',
            border: '1px solid var(--sc-colors-border)',
            borderRadius: 999,
            color:
              failed > 0
                ? 'var(--sc-colors-danger)'
                : passed === probeTotal
                  ? 'var(--sc-colors-success)'
                  : 'var(--sc-colors-textMuted)',
            fontFamily: 'var(--sc-typography-fontFamilyMono, ui-monospace, monospace)',
            fontSize: 12,
            fontWeight: 600,
            padding: '3px 10px',
          }}
        >
          {passed}/{probeTotal} passing{failed > 0 ? ` · ${failed} failing` : ''}
        </span>
      </div>

      <p
        style={{
          color: 'var(--sc-colors-textMuted)',
          fontSize: 14,
          lineHeight: 1.5,
          margin: '0 0 18px',
          maxWidth: '72ch',
        }}
      >
        Each card renders the live scenario in an isolated frame and checks every{' '}
        <code
          style={{
            background: 'var(--sc-colors-surface)',
            border: '1px solid var(--sc-colors-border)',
            borderRadius: 4,
            color: 'var(--sc-colors-text)',
            fontFamily: 'var(--sc-typography-fontFamilyMono, ui-monospace, monospace)',
            fontSize: '0.9em',
            padding: '1px 5px',
          }}
        >
          data-expected
        </code>{' '}
        probe against its computed style. Click any title to open the standalone route.
      </p>

      <ul
        style={{
          display: 'grid',
          gap: 16,
          gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
          listStyle: 'none',
          margin: 0,
          padding: 0,
        }}
      >
        {routes.map(route => (
          <ScenarioCard key={route.href} route={route} onStatus={onStatus} />
        ))}
      </ul>
    </div>
  );
}
