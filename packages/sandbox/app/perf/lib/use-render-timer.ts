'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface RenderTiming {
  label: string;
  ms: number;
}

export function useRenderTimer(historySize = 50) {
  const startRef = useRef(0);
  const [timings, setTimings] = useState<RenderTiming[]>([]);
  const pendingLabelRef = useRef<string | null>(null);

  const markStart = useCallback((label: string) => {
    startRef.current = performance.now();
    pendingLabelRef.current = label;
  }, []);

  useEffect(() => {
    if (pendingLabelRef.current !== null && startRef.current > 0) {
      const ms = performance.now() - startRef.current;
      const label = pendingLabelRef.current;
      pendingLabelRef.current = null;
      startRef.current = 0;
      setTimings(prev => {
        const next = [...prev, { label, ms }];
        return next.length > historySize ? next.slice(-historySize) : next;
      });
    }
  });

  const clear = useCallback(() => setTimings([]), []);

  return { timings, markStart, clear };
}

export interface AutoRunState {
  running: boolean;
  remaining: number;
  total: number;
}

export function useAutoRun(action: () => void, autoStart?: number) {
  const [state, setState] = useState<AutoRunState>({
    running: false,
    remaining: 0,
    total: 0,
  });
  const runningRef = useRef(false);
  const remainingRef = useRef(0);
  const actionRef = useRef(action);
  actionRef.current = action;

  const tick = useCallback(() => {
    if (!runningRef.current || remainingRef.current <= 0) {
      runningRef.current = false;
      setState(s => ({ ...s, running: false, remaining: 0 }));
      return;
    }
    remainingRef.current--;
    setState(s => ({ ...s, remaining: remainingRef.current }));
    actionRef.current();
    requestAnimationFrame(() => {
      setTimeout(tick, 50);
    });
  }, []);

  const start = useCallback(
    (iterations: number) => {
      if (runningRef.current) return;
      runningRef.current = true;
      remainingRef.current = iterations;
      setState({ running: true, remaining: iterations, total: iterations });
      requestAnimationFrame(() => {
        setTimeout(tick, 0);
      });
    },
    [tick]
  );

  const stop = useCallback(() => {
    runningRef.current = false;
    setState(s => ({ ...s, running: false, remaining: 0 }));
  }, []);

  useEffect(() => {
    return () => {
      runningRef.current = false;
    };
  }, []);

  const startedRef = useRef(false);
  useEffect(() => {
    if (autoStart !== undefined && !startedRef.current) {
      startedRef.current = true;
      start(autoStart);
    }
  }, [autoStart, start]);

  return { autoRun: state, start, stop };
}
