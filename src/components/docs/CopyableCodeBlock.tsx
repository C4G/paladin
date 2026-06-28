'use client';

import { useState, useRef } from 'react';
import { Check, Copy } from 'lucide-react';

export function CopyableCodeBlock(props: React.ComponentProps<'pre'>) {
  const [copied, setCopied] = useState(false);
  const preRef = useRef<HTMLPreElement>(null);

  const handleCopy = () => {
    const text = preRef.current?.textContent ?? '';
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className='group relative'>
      <pre ref={preRef} {...props} />
      <button
        onClick={handleCopy}
        className='absolute right-2 top-2 rounded-md border border-border bg-background/80 p-1.5 text-muted-foreground opacity-0 backdrop-blur transition-opacity hover:text-foreground group-hover:opacity-100'
        aria-label='Copy code'
      >
        {copied ? (
          <Check className='h-4 w-4 text-green-500' />
        ) : (
          <Copy className='h-4 w-4' />
        )}
      </button>
    </div>
  );
}
