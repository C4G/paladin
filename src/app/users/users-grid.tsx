'use client';

import { useIsDarkTheme } from '@/hooks/use-is-dark-theme';
import { toast } from '@/hooks/use-toast';
import type { User } from '@prisma/client';
import {
  AllCommunityModule,
  colorSchemeDark,
  ModuleRegistry,
  themeAlpine,
  type ColDef,
  type CellEditingStoppedEvent,
  type GridApi,
} from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';

// Register all Community features
ModuleRegistry.registerModules([AllCommunityModule]);

const defaultColDef: ColDef = {
  sortable: true,
  filter: true,
  editable: true,
};

const columnDefs: ColDef[] = [
  { field: 'name' },
  {
    field: 'email',
    cellRenderer: (params: { value: string }) => {
      if (!params.value) return null;
      return (
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <a
            href={`mailto:${params.value}`}
            title='Send email'
            onClick={(e) => e.stopPropagation()}
            style={{ display: 'inline-flex', opacity: 0.5, cursor: 'pointer' }}
          >
            ✉
          </a>
          <span>{params.value}</span>
        </span>
      );
    },
  },
  {
    field: 'subscription',
    headerName: 'Subscribed',
    cellEditor: 'agCheckboxCellEditor',
    cellRenderer: 'agCheckboxCellRenderer',
  },
  {
    field: 'role',
    cellEditor: 'agSelectCellEditor',
    cellEditorParams: {
      values: [null, 'ADMIN', 'STAFF'],
    },
  },
  { field: 'id', editable: false },
  {
    field: 'createdAt',
    editable: false,
    valueFormatter: (params) =>
      params.value ? new Date(params.value).toLocaleString() : '',
  },
  {
    field: 'updatedAt',
    editable: false,
    valueFormatter: (params) =>
      params.value ? new Date(params.value).toLocaleString() : '',
  },
];

export function UsersGrid() {
  const [rowData, setRowData] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [effectTrigger, setEffectTrigger] = useState(0);
  const [dirtyRows, setDirtyRows] = useState<Set<string>>(new Set());
  const gridRef = useRef<GridApi<User> | null>(null);

  const isDarkTheme = useIsDarkTheme();

  const agGridTheme = useMemo(
    () => (isDarkTheme ? themeAlpine.withPart(colorSchemeDark) : themeAlpine),
    [isDarkTheme]
  );

  const updateUser = useCallback(async (userData: User) => {
    try {
      const response = await fetch(`/api/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        throw new Error('Failed to update user');
      }

      const updatedUser = await response.json();
      toast({
        title: 'User Updated',
        description: `Successfully updated user ${updatedUser.name}`,
      });
      return updatedUser;
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: 'Error',
        description: 'Failed to update user. Please try again.',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setEffectTrigger((effectTrigger) => effectTrigger + 1);
      setIsLoading(false);
    }
  }, []);

  const onCellEditingStopped = useCallback(
    (event: CellEditingStoppedEvent<User, unknown>) => {
      if (event.data && event.valueChanged) {
        setDirtyRows((prev) => new Set(prev).add(event.data!.id));
      }
    },
    []
  );

  const handleSaveAll = useCallback(() => {
    if (!gridRef.current || dirtyRows.size === 0) return;
    setIsLoading(true);
    const promises: Promise<User>[] = [];
    gridRef.current.forEachNode((node) => {
      if (node.data && dirtyRows.has(node.data.id)) {
        promises.push(updateUser(node.data));
      }
    });
    Promise.all(promises).then(() => {
      setDirtyRows(new Set());
    });
  }, [dirtyRows, updateUser]);

  const handleDiscard = useCallback(() => {
    setDirtyRows(new Set());
    setEffectTrigger((prev) => prev + 1);
  }, []);

  useEffect(() => {
    fetch('/api/users')
      .then((response) => response.json())
      .then((data) => {
        setRowData(data);
        setIsLoading(false);
      })
      .catch((error) => console.error('Error fetching users:', error));
  }, [effectTrigger]);

  return (
    <div className='h-full w-full'>
      {dirtyRows.size > 0 && (
        <div className='mb-3 flex items-center gap-3'>
          <Button
            className='bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700'
            onClick={handleSaveAll}
          >
            Save Changes ({dirtyRows.size})
          </Button>
          <Button variant='outline' onClick={handleDiscard}>
            Discard
          </Button>
        </div>
      )}
      <AgGridReact<User>
        gridOptions={{
          columnDefs,
          defaultColDef,
          domLayout: 'autoHeight',
          stopEditingWhenCellsLoseFocus: true,
          pagination: true,
          paginationPageSize: 20,
        }}
        loading={isLoading}
        onCellEditingStopped={onCellEditingStopped}
        onGridReady={(params) => {
          gridRef.current = params.api;
        }}
        rowData={rowData}
        theme={agGridTheme}
      />
    </div>
  );
}
