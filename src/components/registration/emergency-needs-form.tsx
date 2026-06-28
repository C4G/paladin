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

const emergencyNeedsSchema = z.object({
  equipmentType: z.string().min(1, 'Need type is required'),
  details: z.string().min(1, 'Details are required').optional(),
});

const emergencyNeedsFormSchema = z.discriminatedUnion('noNeeds', [
  // When noNeeds is false (default), validate the needs array
  z.object({
    noNeeds: z.literal(false),
    emergencyNeeds: z
      .array(emergencyNeedsSchema)
      .min(1, 'At least one emergency need is required'),
    deletedNeedIds: z.array(z.string()).optional(),
  }),
  // When noNeeds is true, no validation for needs array
  z.object({
    noNeeds: z.literal(true),
    emergencyNeeds: z.array(z.any()).optional(),
    deletedNeedIds: z.array(z.string()).optional(),
  }),
]);

type EmergencyNeedsFormValues = z.infer<typeof emergencyNeedsFormSchema>;

interface EmergencyNeedsFormProps {
  onStateChange: (_state: {
    isValid: boolean;
    data: EmergencyNeedsFormValues | null;
  }) => void;
  initialData?: EmergencyNeedsFormValues | null;
}

export const EmergencyNeedsForm = forwardRef<
  FormSectionRef,
  EmergencyNeedsFormProps
>(({ onStateChange, initialData }, ref) => {
  const form = useForm<EmergencyNeedsFormValues>({
    resolver: zodResolver(emergencyNeedsFormSchema),
    defaultValues: initialData || {
      noNeeds: true,
      emergencyNeeds: [{ equipmentType: '', details: '' }],
      deletedNeedIds: [],
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
    name: 'emergencyNeeds',
  });

  const noNeeds = form.watch('noNeeds');

  // Reset validation errors when noNeeds changes
  useEffect(() => {
    form.clearErrors();

    // Update parent state when noNeeds changes
    const data = form.getValues();

    const updatedData = {
      ...data,
      deletedNeedIds: data.deletedNeedIds || [], // Ensure it exists
    };
    const isValid =
      data.noNeeds || Object.keys(form.formState.errors).length === 0;

    onStateChange({ isValid, data: updatedData });
  }, [noNeeds]);

  // Initial validation check
  useEffect(() => {
    // Check if we have initial data and it's valid
    if (initialData) {
      // Ensure deletedNeedIds is included in initial data
      const updatedInitialData = {
        ...initialData,
        deletedNeedIds: initialData.deletedNeedIds || [], // Ensure it's always present
      };

      // Validate the initial data
      form.trigger().then((isValid) => {
        onStateChange({
          isValid: updatedInitialData.noNeeds || isValid,
          data: updatedInitialData,
        });
      });
    } else {
      // Just set the initial data without claiming it's invalid
      const data = form.getValues();
      onStateChange({
        isValid: data.noNeeds,
        data: { ...data, deletedNeedIds: [] }, // Ensure deletedNeedIds is always present
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Replace the validateAllFields function with this simpler version
  const validateAllFields = async () => {
    if (!noNeeds) {
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
        data.noNeeds || Object.keys(form.formState.errors).length === 0;
      onStateChange({ isValid, data });
    });

    return () => subscription.unsubscribe();
  }, [form, onStateChange]);

  const handleDelete = (index: number) => {
    const data = form.getValues();
    if (data.emergencyNeeds) {
      const needId = data.emergencyNeeds[index].id;

      // ensure deletedcropids exists and add the current id if it has one
      const updatedDeletedNeedIds = [
        ...(data.deletedNeedIds || []),
        ...(needId ? [needId] : []),
      ];

      form.clearErrors(`emergencyNeeds.${index}`);

      // Update form state with removed needs
      form.setValue('deletedNeedIds', updatedDeletedNeedIds);

      // Remove the need from the needs array
      const updatedNeeds = (data.emergencyNeeds || []).filter(
        (emergencyNeed) => emergencyNeed.id !== needId
      );

      const isValid = updatedNeeds.length > 0 || data.noNeeds;

      onStateChange({
        isValid,
        data: {
          ...data,
          emergencyNeeds: updatedNeeds,
          deletedNeedIds: updatedDeletedNeedIds, // Ensure deletedNeedIds is included
        },
      });
    } else {
      // Else case for when needs is not defined or index is invalid
      console.warn('Invalid index or needs data is undefined.');

      // If no needs, set deletedNeedIds to empty array (or handle as needed)
      const updatedDeletedNeedIds = data.deletedNeedIds || [];

      // Pass updated data to parent
      onStateChange({
        isValid: true, // Set isValid based on your specific use case
        data: {
          ...data,
          deletedNeedIds: updatedDeletedNeedIds,
        },
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Emergency Needs Information</CardTitle>
        <CardDescription>
          List any equipment needs you may have specific to your property during
          an emergency or disaster.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form>
          <CardContent className='space-y-6'>
            <FormField
              control={form.control}
              name='noNeeds'
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
                      I do not have any specific equipment needs.
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />

            {!noNeeds && (
              <div className='space-y-4'>
                <div className='rounded-md border p-4'>
                  <div className='font-medium'>Emergency Needs List</div>
                  <p className='text-sm text-muted-foreground'>
                    Add all your specific emergency and disaster equipment
                    needs.
                  </p>

                  <div className='mt-4 space-y-4'>
                    {fields.map((field, index) => (
                      <div
                        key={field.id}
                        className='grid grid-cols-1 gap-4 rounded-lg border p-4 md:grid-cols-12'
                      >
                        <FormField
                          control={form.control}
                          name={`emergencyNeeds.${index}.equipmentType`}
                          render={({ field }) => (
                            <FormItem className='md:col-span-4'>
                              <FormLabel>Equipment Type</FormLabel>
                              <FormControl>
                                <Input placeholder='Tractor' {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`emergencyNeeds.${index}.details`}
                          render={({ field }) => (
                            <FormItem className='md:col-span-4'>
                              <FormLabel>Details</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder='For clearing debris'
                                  {...field}
                                />
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
                        equipmentType: '',
                        details: '',
                      })
                    }
                  >
                    <Plus className='mr-2 h-4 w-4' />
                    Add Emergency Need
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </form>
      </Form>
    </Card>
  );
});

EmergencyNeedsForm.displayName = 'EmergencyNeedsForm';
