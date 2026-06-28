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
    .filter(
      (n) => n.type === 'page' || n.type === 'folder' || n.type === 'separator'
    )
    .map((node) => {
      if (node.type === 'separator') {
        return {
          type: 'separator' as const,
          name: node.name,
        };
      }
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

export function DevDocsLayoutClient({
  tree,
  children,
}: {
  tree: any;
  children: ReactNode;
}) {
  const sidebarTree = convertTree(tree.children || []);

  return (
    <div className='min-h-screen'>
      <MobileDocsSidebar
        tree={sidebarTree}
        title='Developer Docs'
        homeUrl='/dev-docs'
      />
      <div className='mx-auto flex max-w-screen-xl'>
        <DocsSidebar
          tree={sidebarTree}
          title='Developer Docs'
          homeUrl='/dev-docs'
        />
        <main className='min-w-0 flex-1 px-6 py-8 md:px-10'>{children}</main>
      </div>
    </div>
  );
}
