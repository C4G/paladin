import { source } from '@/lib/source';
import type { ReactNode } from 'react';
import { DocsLayoutClient } from './layout.client';

export default function DocsLayout({ children }: { children: ReactNode }) {
  const tree = source.getPageTree();
  return <DocsLayoutClient tree={tree}>{children}</DocsLayoutClient>;
}
