'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, BookOpen } from 'lucide-react';
import { useState } from 'react';

interface PageNode {
  type: 'page';
  name: string;
  url: string;
}

interface FolderNode {
  type: 'folder';
  name: string;
  children: (PageNode | FolderNode | SeparatorNode)[];
}

interface SeparatorNode {
  type: 'separator';
  name?: string;
}

type TreeNode = PageNode | FolderNode | SeparatorNode;

function SidebarFolder({
  node,
  pathname,
}: {
  node: FolderNode;
  pathname: string;
}) {
  const isActive = node.children.some(
    (child) => child.type === 'page' && pathname === child.url
  );
  const [open, setOpen] = useState(true);

  return (
    <div className='mb-1 mt-4 first:mt-0'>
      <button
        onClick={() => setOpen(!open)}
        className='flex w-full items-center gap-1 rounded-md px-3 py-1 transition-colors hover:bg-muted'
      >
        <ChevronDown
          className={`h-3 w-3 shrink-0 text-muted-foreground transition-transform duration-200 ${!open ? '-rotate-90' : ''}`}
        />
        <span
          className={`text-xs font-semibold uppercase tracking-wider ${isActive ? 'text-primary' : 'text-muted-foreground'}`}
        >
          {node.name}
        </span>
      </button>
      {open && (
        <div className='ml-3 space-y-0.5 border-l border-border pl-2'>
          {node.children.map((child) =>
            child.type === 'page' ? (
              <SidebarPage key={child.url} node={child} pathname={pathname} />
            ) : child.type === 'folder' ? (
              <SidebarFolder
                key={child.name}
                node={child}
                pathname={pathname}
              />
            ) : null
          )}
        </div>
      )}
    </div>
  );
}

function SidebarPage({ node, pathname }: { node: PageNode; pathname: string }) {
  const isActive = pathname === node.url;
  return (
    <Link
      href={node.url}
      className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors ${
        isActive
          ? 'bg-primary/10 font-medium text-primary'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
    >
      {node.name}
    </Link>
  );
}

function SidebarSection({
  node,
  items,
  pathname,
}: {
  node: SeparatorNode;
  items: TreeNode[];
  pathname: string;
}) {
  const isActive = items.some(
    (child) => child.type === 'page' && pathname === child.url
  );
  const [open, setOpen] = useState(true);

  return (
    <div className='mb-1 mt-4 first:mt-0'>
      <button
        onClick={() => setOpen(!open)}
        className='flex w-full items-center gap-1 rounded-md px-3 py-1 transition-colors hover:bg-muted'
      >
        <ChevronDown
          className={`h-3 w-3 shrink-0 text-muted-foreground transition-transform duration-200 ${!open ? '-rotate-90' : ''}`}
        />
        <span
          className={`text-xs font-semibold uppercase tracking-wider ${isActive ? 'text-primary' : 'text-muted-foreground'}`}
        >
          {node.name}
        </span>
      </button>
      {open && (
        <div className='ml-3 space-y-0.5 border-l border-border pl-2'>
          {items.map((child) =>
            child.type === 'page' ? (
              <SidebarPage key={child.url} node={child} pathname={pathname} />
            ) : child.type === 'folder' ? (
              <SidebarFolder
                key={child.name}
                node={child}
                pathname={pathname}
              />
            ) : null
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Group flat tree nodes into sections: items before the first separator
 * are ungrouped, then each separator starts a new group with its children
 * indented beneath it.
 */
function renderTree(tree: TreeNode[], pathname: string) {
  const sections: { separator?: SeparatorNode; items: TreeNode[] }[] = [];
  let current: { separator?: SeparatorNode; items: TreeNode[] } = { items: [] };

  for (const node of tree) {
    if (node.type === 'separator') {
      if (current.separator || current.items.length > 0) {
        sections.push(current);
      }
      current = { separator: node, items: [] };
    } else {
      current.items.push(node);
    }
  }
  if (current.separator || current.items.length > 0) {
    sections.push(current);
  }

  return sections.map((section, i) => (
    <div key={section.separator?.name ?? `section-${i}`}>
      {section.separator ? (
        <SidebarSection
          node={section.separator}
          items={section.items}
          pathname={pathname}
        />
      ) : (
        <div className='space-y-0.5'>
          {section.items.map((node) =>
            node.type === 'page' ? (
              <SidebarPage key={node.url} node={node} pathname={pathname} />
            ) : node.type === 'folder' ? (
              <SidebarFolder key={node.name} node={node} pathname={pathname} />
            ) : null
          )}
        </div>
      )}
    </div>
  ));
}

interface SidebarProps {
  tree: TreeNode[];
  title?: string;
  homeUrl?: string;
}

export function DocsSidebar({
  tree,
  title = 'User Manual',
  homeUrl = '/docs',
}: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className='sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 overflow-y-auto border-r py-6 pr-4 md:block lg:w-72'>
      <nav className='flex flex-col gap-0.5'>
        <div className='mb-4 flex items-center gap-2 px-3 py-2'>
          <div className='flex h-7 w-7 items-center justify-center rounded-md bg-foreground'>
            <BookOpen className='h-4 w-4 text-background' />
          </div>
          <Link
            href={homeUrl}
            className='text-sm font-semibold text-foreground hover:text-primary'
          >
            {title}
          </Link>
        </div>
        <div className='space-y-0.5'>{renderTree(tree, pathname)}</div>
      </nav>
    </aside>
  );
}

export function MobileDocsSidebar({
  tree,
  title = 'User Manual',
}: SidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className='border-b md:hidden'>
      <button
        onClick={() => setOpen(!open)}
        className='flex w-full items-center justify-between px-4 py-3 text-sm font-medium'
      >
        <span className='flex items-center gap-2'>
          <BookOpen className='h-4 w-4' />
          {title}
        </span>
        <ChevronDown
          className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <nav className='space-y-0.5 px-2 pb-4' onClick={() => setOpen(false)}>
          {renderTree(tree, pathname)}
        </nav>
      )}
    </div>
  );
}
