'use client';

import Link from 'next/link';
import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Search, Trash2, Edit, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ConfirmModal from '@/components/ConfirmModal';
import type { DisasterResource } from '@prisma/client';

export default function DisasterResourceList({
  resources,
  onDelete,
  onEdit,
  onAddNew,
  isAdmin = false,
}: {
  resources: DisasterResource[];
  onDelete: (_id: string) => void;
  onEdit: (_resource: DisasterResource) => void;
  onAddNew: () => void;
  isAdmin?: boolean;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filteredResources = useMemo(() => {
    return resources.filter((resource) =>
      Object.values(resource).some((value) =>
        value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [resources, searchTerm]);

  return (
    <div className='space-y-4'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div className='relative w-full'>
          <Input
            type='text'
            placeholder='Search resources...'
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className='pl-10 text-foreground'
          />
          <Search
            className='absolute left-3 top-1/2 -translate-y-1/2 transform text-muted-foreground'
            size={20}
          />
        </div>
        {isAdmin && (
          <Button
            onClick={onAddNew}
            className='hidden bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:text-white dark:hover:bg-blue-600 sm:block lg:flex'
          >
            + Add Resource
          </Button>
        )}
      </div>

      <div className='rounded-lg border border-border bg-card shadow-sm'>
        <div className='max-h-[calc(100vh-12rem)] overflow-y-auto'>
          {filteredResources.length === 0 ? (
            <div className='flex h-32 items-center justify-center p-4 text-muted-foreground'>
              <p>No matching resources found.</p>
            </div>
          ) : (
            <ul className='divide-y divide-border'>
              {filteredResources.map((resource) => (
                <li
                  key={resource.id}
                  className='p-4 transition-colors hover:bg-muted/50'
                >
                  <div className='flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between'>
                    <div className='space-y-2'>
                      <h2 className='text-xl font-semibold text-card-foreground'>
                        {resource.name}
                      </h2>
                      <div className='flex items-center gap-1 text-blue-600 dark:text-blue-400'>
                        <Link
                          href={resource.link}
                          className='hover:text-blue-800 hover:underline dark:hover:text-blue-300'
                          target='_blank'
                          rel='noopener noreferrer'
                        >
                          {resource.link}
                        </Link>
                        <ExternalLink size={14} />
                      </div>
                      {resource.description && (
                        <p className='text-muted-foreground'>
                          {resource.description}
                        </p>
                      )}
                    </div>

                    {isAdmin && (
                      <div className='flex gap-2 self-end sm:self-start'>
                        <button
                          onClick={() => onEdit(resource)}
                          className='rounded-md p-1.5 text-yellow-600 hover:bg-yellow-100 hover:text-yellow-700 dark:text-yellow-400 dark:hover:bg-yellow-900/30 dark:hover:text-yellow-300'
                          aria-label={`Edit ${resource.name}`}
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => setDeleteId(resource.id)}
                          className='rounded-md p-1.5 text-red-600 hover:bg-red-100 hover:text-red-700 dark:text-red-500 dark:hover:bg-red-900/30 dark:hover:text-red-400'
                          aria-label={`Delete ${resource.name}`}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Delete confirmation modal */}
      {deleteId && (
        <ConfirmModal
          message='Are you sure you want to delete this resource?'
          onConfirm={() => {
            onDelete(deleteId);
            setDeleteId(null);
          }}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </div>
  );
}
