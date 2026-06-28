import { devDocsSource } from '@/lib/source';
import type { ReactNode } from 'react';
import { DevDocsLayoutClient } from './layout.client';

export default function DevDocsLayout({ children }: { children: ReactNode }) {
  const tree = devDocsSource.getPageTree();
  return <DevDocsLayoutClient tree={tree}>{children}</DevDocsLayoutClient>;
}
