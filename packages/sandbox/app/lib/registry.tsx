'use client';

import { useServerInsertedHTML } from 'next/navigation';
import React, { useRef, useState } from 'react';
import { ServerStyleSheet, StyleSheetManager } from 'styled-components';

export default function StyledComponentsRegistry({ children }: { children: React.ReactNode }) {
  const [styledComponentsStyleSheet] = useState(() => new ServerStyleSheet());
  const chunkRef = useRef(0);

  useServerInsertedHTML(() => {
    const css = styledComponentsStyleSheet.instance.toString();
    styledComponentsStyleSheet.instance.clearTag();
    if (!css) return null;

    const chunk = chunkRef.current++;

    return (
      <style
        precedence="styled-components"
        href={`sc-registry-${chunk}`}
        dangerouslySetInnerHTML={{ __html: css }}
      />
    );
  });

  if (typeof window !== 'undefined') return <>{children}</>;

  return (
    <StyleSheetManager sheet={styledComponentsStyleSheet.instance}>
      {children as any}
    </StyleSheetManager>
  );
}
