'use client';

import { useEffect, useRef, useState } from 'react';

export function Mermaid({ chart }: { chart: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');

  useEffect(() => {
    let cancelled = false;

    import('mermaid').then(({ default: mermaid }) => {
      if (cancelled) return;
      mermaid.initialize({
        startOnLoad: false,
        theme: 'base',
        fontFamily: 'inherit',
        themeVariables: {
          primaryColor: '#eff6ff',
          primaryTextColor: '#334155',
          primaryBorderColor: '#93c5fd',
          lineColor: '#93c5fd',
          secondaryColor: '#f8fafc',
          tertiaryColor: '#f0f9ff',
          noteBkgColor: '#fefce8',
          noteTextColor: '#334155',
          noteBorderColor: '#fbbf24',
          actorBkg: '#dbeafe',
          actorTextColor: '#334155',
          actorBorder: '#93c5fd',
          actorLineColor: '#93c5fd',
          signalColor: '#475569',
          signalTextColor: '#475569',
          activationBkgColor: '#eff6ff',
          activationBorderColor: '#93c5fd',
          sequenceNumberColor: '#ffffff',
          labelBoxBkgColor: '#eff6ff',
          labelBoxBorderColor: '#93c5fd',
          labelTextColor: '#475569',
          loopTextColor: '#475569',
          classText: '#334155',
        },
      });
      mermaid
        .render(`mermaid-${Math.random().toString(36).slice(2)}`, chart)
        .then(({ svg: renderedSvg }) => {
          if (!cancelled) setSvg(renderedSvg);
        });
    });

    return () => {
      cancelled = true;
    };
  }, [chart]);

  if (!svg) {
    return (
      <div className='flex items-center justify-center rounded-lg border bg-muted/50 p-8 text-sm text-muted-foreground'>
        Loading diagram…
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className='my-6 flex justify-center [&_svg]:max-w-full'
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
