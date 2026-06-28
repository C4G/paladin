'use client';

import { DocsSidebar, MobileDocsSidebar } from '@/components/docs/sidebar';
import type { ReactNode } from 'react';

interface PageTreeNode {
  type: string;
  name: string;
  url?: string;
  children?: PageTreeNode[];
}

function convertTree(nodes: PageTreeNode[]): any[] {
  return nodes
    .filter((n) => n.type === 'page' || n.type === 'folder')
    .map((node) => {
      if (node.type === 'folder') {
        return {
          type: 'folder' as const,
          name: node.name,
          children: convertTree(node.children || []),
        };
      }
      return {
        type: 'page' as const,
        name: node.name,
        url: node.url || '',
      };
    });
}

export function DocsLayoutClient({
  tree,
  children,
}: {
  tree: any;
  children: ReactNode;
}) {
  const sidebarTree = convertTree(tree.children || []);

  return (
    <div className='min-h-screen'>
      <MobileDocsSidebar tree={sidebarTree} />
      <div className='mx-auto flex max-w-screen-xl'>
        <DocsSidebar tree={sidebarTree} />
        <main className='min-w-0 flex-1 px-6 py-8 md:px-10'>{children}</main>
      </div>
    </div>
  );
}
