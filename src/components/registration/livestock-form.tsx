'use client';

import { useEffect, forwardRef, useImperativeHandle } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Plus, Trash2 } from 'lucide-react';
import { FormSectionRef } from '@/../types/formsRefs';

const livestockSchema = z.object({
  animalType: z.string().min(1, 'Animal type is required'),
  count: z.string().min(1, 'Count is required'),
});

const livestockFormSchema = z.discriminatedUnion('noLivestock', [
  // When noLivestock is false (default), validate the livestock array
  z.object({
    noLivestock: z.literal(false),
    livestock: z
      .array(livestockSchema)
      .min(1, 'At least one livestock type is required'),
    deletedLivestockIds: z.array(z.string()).optional(),
  }),
  // When noLivestock is true, no validation for livestock array
  z.object({
    noLivestock: z.literal(true),
    livestock: z.array(z.any()).optional(),
    deletedLivestockIds: z.array(z.string()).optional(),
  }),
]);

type LivestockFormValues = z.infer<typeof livestockFormSchema>;

interface LivestockFormProps {
  onStateChange: (_state: {
    isValid: boolean;
    data: LivestockFormValues | null;
  }) => void;
  initialData?: LivestockFormValues | null;
}

export const LivestockForm = forwardRef<FormSectionRef, LivestockFormProps>(
  ({ onStateChange, initialData }, ref) => {
    const form = useForm<LivestockFormValues>({
      resolver: zodResolver(livestockFormSchema),
      defaultValues: initialData || {
        noLivestock: true,
        livestock: [{ animalType: '', count: '' }],
        deletedLivestockIds: [],
      },
      mode: 'onTouched',
      reValidateMode: 'onChange',
      shouldUnregister: false,
    });

    //expose validaiton to parent
    useImperativeHandle(ref, () => ({
      triggerValidation: validateAllFields,
    }));

    const { fields, append, remove } = useFieldArray({
      control: form.control,
      name: 'livestock',
    });

    const noLivestock = form.watch('noLivestock');

    // Reset validation errors when noLivestock changes
    useEffect(() => {
      form.clearErrors();

      // Update parent state when noLivestock changes
      const data = form.getValues();

      const updatedData = {
        ...data,
        deletedLivestockIds: data.deletedLivestockIds || [], // Ensure it exists
      };

      const isValid =
        data.noLivestock || Object.keys(form.formState.errors).length === 0;

      onStateChange({ isValid, data: updatedData });
    }, [noLivestock]);

    // Initial validation check
    useEffect(() => {
      // Check if we have initial data and it's valid
      if (initialData) {
        // Ensure deletedLivestockIds is included in initial data
        const updatedInitialData = {
          ...initialData,
          deletedLivestockIds: initialData.deletedLivestockIds || [], // Ensure it's always present
        };

        // Validate the initial data
        form.trigger().then((isValid) => {
          onStateChange({
            isValid: initialData.noLivestock || isValid,
            data: updatedInitialData,
          });
        });
      } else {
        // Just set the initial data without claiming it's invalid
        const data = form.getValues();
        onStateChange({
          isValid: data.noLivestock,
          data: { ...data, deletedLivestockIds: [] }, // Ensure deletedLivestockIds is always present
        });
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Add this method to the component to expose validation
    const validateAllFields = async () => {
      if (!noLivestock) {
        // Force validation for all fields
        const result = await form.trigger();

        // Get the current form values
        const data = form.getValues();

        // Update parent state with validation result
        onStateChange({ isValid: result, data });

        return result;
      } else {
        const data = form.getValues();
        onStateChange({ isValid: true, data });
        return true;
      }
    };

    useEffect(() => {
      const subscription = form.watch(() => {
        const data = form.getValues();
        const isValid =
          data.noLivestock || Object.keys(form.formState.errors).length === 0;
        onStateChange({ isValid, data });
      });

      return () => subscription.unsubscribe();
    }, [form, onStateChange]);

    const handleDelete = (index: number) => {
      const data = form.getValues();
      if (data.livestock) {
        const livestockId = data.livestock[index].id;

        // ensure deletedcropids exists and add the current id if it has one
        const updatedDeletedLivestockIds = [
          ...(data.deletedLivestockIds || []),
          ...(livestockId ? [livestockId] : []),
        ];

        form.clearErrors(`livestock.${index}`);

        // Update form state with removed livestock
        form.setValue('deletedLivestockIds', updatedDeletedLivestockIds);

        // Remove the livestock from the livestock array
        const updatedLivestock = (data.livestock || []).filter(
          (livestock) => livestock.id !== livestockId
        );

        const isValid = updatedLivestock.length > 0 || data.noLivestock;

        onStateChange({
          isValid,
          data: {
            ...data,
            livestock: updatedLivestock,
            deletedLivestockIds: updatedDeletedLivestockIds, // Ensure deletedLivestockIds is included
          },
        });
      } else {
        // Else case for when livestock is not defined or index is invalid
        console.warn('Invalid index or livestock data is undefined.');

        // If no livestock, set deletedLivestockIds to empty array (or handle as needed)
        const updatedDeletedLivestockIds = data.deletedLivestockIds || [];

        // Pass updated data to parent
        onStateChange({
          isValid: true, // Set isValid based on your specific use case
          data: {
            ...data,
            deletedLivestockIds: updatedDeletedLivestockIds,
          },
        });
      }
    };

    return (
      <Card>
        <CardHeader>
          <CardTitle>Livestock Information</CardTitle>
          <CardDescription>
            Tell us about the livestock you raise on your property.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form>
            <CardContent className='space-y-6'>
              <FormField
                control={form.control}
                name='noLivestock'
                render={({ field }) => (
                  <FormItem className='flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4'>
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(checked) => {
                          field.onChange(checked);
                          // Validate after changing the checkbox
                          setTimeout(() => {
                            const data = form.getValues();
                            onStateChange({ isValid: !!checked, data });
                          }, 0);
                        }}
                      />
                    </FormControl>
                    <div className='space-y-1 leading-none'>
                      <FormLabel>
                        I do not raise livestock on my property
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              {!noLivestock && (
                <div className='space-y-4'>
                  <div className='rounded-md border p-4'>
                    <div className='font-medium'>Livestock List</div>
                    <p className='text-sm text-muted-foreground'>
                      Add all the livestock you raise on your property.
                    </p>

                    <div className='mt-4 space-y-4'>
                      {fields.map((field, index) => (
                        <div
                          key={field.id}
                          className='grid grid-cols-1 gap-4 rounded-lg border p-4 md:grid-cols-12'
                        >
                          <FormField
                            control={form.control}
                            name={`livestock.${index}.animalType`}
                            render={({ field }) => (
                              <FormItem className='md:col-span-5'>
                                <FormLabel>Animal Type</FormLabel>
                                <FormControl>
                                  <Input placeholder='Cattle' {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`livestock.${index}.count`}
                            render={({ field }) => (
                              <FormItem className='md:col-span-2'>
                                <FormLabel>Count</FormLabel>
                                <FormControl>
                                  <Input placeholder='50' {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <div className='flex items-end md:col-span-1'>
                            <Button
                              type='button'
                              variant='ghost'
                              size='icon'
                              onClick={() => {
                                handleDelete(index); // Pass the ID to handleDelete

                                if (fields.length > 1) {
                                  remove(index);
                                  // Validate after removing a field
                                  setTimeout(() => {
                                    form.trigger().then((isValid) => {
                                      const data = form.getValues();
                                      onStateChange({ isValid, data });
                                    });
                                  }, 0);
                                }
                              }}
                              disabled={fields.length <= 1}
                            >
                              <Trash2 className='h-4 w-4' />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      className='mt-4'
                      onClick={() =>
                        append({
                          animalType: '',
                          count: '',
                        })
                      }
                    >
                      <Plus className='mr-2 h-4 w-4' />
                      Add Livestock
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </form>
        </Form>
      </Card>
    );
  }
);

LivestockForm.displayName = 'LivestockForm';
