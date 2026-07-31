'use client';

import { useServerInsertedHTML } from 'next/navigation';
import React, { useRef, useState } from 'react';
import { ServerStyleSheet, StyleSheetManager } from 'styled-components';

/** FOUC guard for html.dark / html.light; injected via useServerInsertedHTML to avoid React 19's script-in-tree warning. */
const THEME_BOOT_SCRIPT = `(function(){try{var d=document.documentElement,s=localStorage.getItem('theme');if(s==='dark'||s==='light'){d.classList.add(s)}else if(window.matchMedia('(prefers-color-scheme:dark)').matches){d.classList.add('dark')}}catch(e){}})();`;

export default function StyledComponentsRegistry({ children }: { children: React.ReactNode }) {
  const [styledComponentsStyleSheet] = useState(() => new ServerStyleSheet());
  const themeBootInserted = useRef(false);

  useServerInsertedHTML(() => {
    const styles = styledComponentsStyleSheet.getStyleElement();
    styledComponentsStyleSheet.instance.clearTag();
    const boot =
      themeBootInserted.current === false ? (
        <script key="sc-theme-boot" dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      ) : null;
    themeBootInserted.current = true;
    return (
      <>
        {boot}
        {styles}
      </>
    );
  });

  if (typeof window !== 'undefined') return <>{children}</>;

  return (
    <StyleSheetManager sheet={styledComponentsStyleSheet.instance}>{children}</StyleSheetManager>
  );
}
