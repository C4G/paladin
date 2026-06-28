'use client';

import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import type { DisasterResource } from '@prisma/client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

// Form validation schema
const resourceFormSchema = z.object({
  name: z.string().min(1, { message: 'Name is required' }),
  link: z.string().url({ message: 'Please enter a valid URL' }),
  description: z.string().optional(),
});

type ResourceFormValues = z.infer<typeof resourceFormSchema>;

export default function AddEditResourceModal({
  isOpen,
  setIsOpen,
  onResourceAdded,
  resourceToEdit = null,
}: {
  isOpen: boolean;
  setIsOpen: (_isOpen: boolean) => void;
  onResourceAdded: () => void;
  resourceToEdit?: DisasterResource | null;
}) {
  const [error, setError] = useState('');

  // Only consider it editing if resourceToEdit is not null and has a valid ID
  const isEditing = !!resourceToEdit && !!resourceToEdit.id;

  // Initialize form with react-hook-form
  const form = useForm<ResourceFormValues>({
    resolver: zodResolver(resourceFormSchema),
    defaultValues: {
      name: '',
      link: '',
      description: '',
    },
  });

  // Update form values when resourceToEdit changes
  useEffect(() => {
    if (resourceToEdit) {
      form.reset({
        name: resourceToEdit.name,
        link: resourceToEdit.link,
        description: resourceToEdit.description || '',
      });
    } else {
      form.reset({
        name: '',
        link: '',
        description: '',
      });
    }
  }, [resourceToEdit, form]);

  // Handle form submission
  const onSubmit = async (values: ResourceFormValues) => {
    setError('');
    try {
      const url = isEditing
        ? `/api/disaster-resources/${resourceToEdit?.id}`
        : '/api/disaster-resources';
      const method = isEditing ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      let responseData;
      const responseText = await response.text();
      try {
        responseData = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse response as JSON:', parseError);
        throw new Error('Invalid JSON response from server');
      }

      if (response.ok) {
        setIsOpen(false);
        form.reset();
        onResourceAdded();
      } else {
        console.error(
          `Failed to ${isEditing ? 'update' : 'create'} resource:`,
          responseData
        );
        setError(
          responseData.error ||
            `Failed to ${isEditing ? 'update' : 'create'} resource`
        );
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      setError(
        `An error occurred: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  };

  const handleDialogClose = () => {
    setIsOpen(false);
    setError('');
    form.reset();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className='sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit' : 'Add'} Disaster Resource
          </DialogTitle>
        </DialogHeader>

        {error && (
          <Alert variant='destructive'>
            <AlertCircle className='h-4 w-4' />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Name <span className='text-red-500'>*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder='Resource name' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='link'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Link <span className='text-red-500'>*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type='url'
                      placeholder='https://example.com'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='description'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder='Brief description of the resource'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className='mt-6'>
              <Button
                type='button'
                variant='outline'
                onClick={handleDialogClose}
              >
                Cancel
              </Button>
              <Button type='submit' className='dark:bg-gray-800'>
                Save
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
