'use client';

import styled from 'styled-components';
import type { AutoRunState, RenderTiming } from './use-render-timer';

interface TimerDisplayProps {
  timings: RenderTiming[];
  onClear: () => void;
  autoRun?: AutoRunState;
  onAutoStart?: (iterations: number) => void;
  onAutoStop?: () => void;
}

const PRESETS = [5, 10, 25, 50];

export function TimerDisplay({
  timings,
  onClear,
  autoRun,
  onAutoStart,
  onAutoStop,
}: TimerDisplayProps) {
  const hasAuto = autoRun && onAutoStart && onAutoStop;

  if (timings.length === 0) {
    return (
      <Wrapper $idle $running={false}>
        <Row>
          <Label>Render timer</Label>
          {hasAuto && (
            <Controls>
              {PRESETS.map(n => (
                <Btn key={n} onClick={() => onAutoStart(n)}>
                  Run {n}x
                </Btn>
              ))}
            </Controls>
          )}
        </Row>
      </Wrapper>
    );
  }

  const last = timings[timings.length - 1];
  const sorted = timings.map(t => t.ms).sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const running = autoRun?.running ?? false;

  return (
    <Wrapper $idle={false} $running={running}>
      <Row>
        <Stat>
          <Val>{last.ms.toFixed(1)}ms</Val> {last.label}
        </Stat>
        <Sep />
        <Stat>
          <Val>{median.toFixed(1)}ms</Val> median ({timings.length})
        </Stat>
        {timings.length > 1 && (
          <>
            <Sep />
            <Stat>
              {min.toFixed(1)} min / {max.toFixed(1)} max
            </Stat>
          </>
        )}
        {running && autoRun && (
          <>
            <Sep />
            <Progress>
              {autoRun.total - autoRun.remaining}/{autoRun.total}
            </Progress>
            <Btn $danger onClick={onAutoStop}>
              Stop
            </Btn>
          </>
        )}
        <Spacer />
        {hasAuto && !running && (
          <Controls>
            {PRESETS.map(n => (
              <Btn key={n} onClick={() => onAutoStart(n)}>
                {n}x
              </Btn>
            ))}
          </Controls>
        )}
        <Btn onClick={onClear}>Clear</Btn>
        <Details>
          <summary>Samples</summary>
          <SampleList>
            {timings.map((t, i) => (
              <Sample key={i} $latest={i === timings.length - 1}>
                {t.ms.toFixed(1)}
              </Sample>
            ))}
          </SampleList>
        </Details>
      </Row>
    </Wrapper>
  );
}

const Wrapper = styled.div<{ $idle: boolean; $running: boolean }>`
  position: sticky;
  top: 0;
  z-index: 50;
  background: ${p => (p.$idle ? p.theme.colors.surface : p.theme.colors.background)};
  border: 2px solid
    ${p =>
      p.$running
        ? p.theme.colors.success
        : p.$idle
        ? p.theme.colors.border
        : p.theme.colors.primary};
  border-radius: 8px;
  padding: 6px 12px;
  font-family: ui-monospace, 'SF Mono', monospace;
  font-size: 12px;
  color: ${p => p.theme.colors.text};
  margin-bottom: 16px;
  backdrop-filter: blur(8px);
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
`;

const Label = styled.span`
  color: ${p => p.theme.colors.textMuted};
`;

const Stat = styled.span`
  color: ${p => p.theme.colors.textMuted};
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
`;

const Val = styled.span`
  font-weight: 700;
  font-size: 14px;
  color: ${p => p.theme.colors.text};
  font-variant-numeric: tabular-nums;
  display: inline-block;
  min-width: 7ch;
  text-align: right;
`;

const Sep = styled.div`
  width: 1px;
  height: 14px;
  background: ${p => p.theme.colors.border};
  flex-shrink: 0;
`;

const Progress = styled.span`
  font-weight: 600;
  color: ${p => p.theme.colors.success};
  font-variant-numeric: tabular-nums;
`;

const Spacer = styled.div`
  flex: 1;
`;

const Controls = styled.div`
  display: flex;
  gap: 4px;
`;

const Btn = styled.button<{ $danger?: boolean }>`
  background: ${p => (p.$danger ? p.theme.colors.danger : p.theme.colors.surface)};
  border: 1px solid ${p => (p.$danger ? p.theme.colors.danger : p.theme.colors.border)};
  border-radius: 4px;
  color: ${p => (p.$danger ? '#fff' : p.theme.colors.text)};
  padding: 1px 6px;
  font-size: 11px;
  font-family: ui-monospace, 'SF Mono', monospace;
  cursor: pointer;

  &:hover {
    border-color: ${p => (p.$danger ? p.theme.colors.danger : p.theme.colors.primary)};
    color: ${p => (p.$danger ? '#fff' : p.theme.colors.primary)};
  }
`;

const Details = styled.details`
  font-size: 11px;
  color: ${p => p.theme.colors.textMuted};

  & > summary {
    cursor: pointer;
    user-select: none;
  }
`;

const SampleList = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 4px;
`;

const Sample = styled.span<{ $latest: boolean }>`
  color: ${p => (p.$latest ? p.theme.colors.primary : p.theme.colors.textMuted)};
  font-weight: ${p => (p.$latest ? 600 : 400)};
`;
