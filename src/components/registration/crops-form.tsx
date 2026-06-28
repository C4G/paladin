'use client';

import { useEffect, forwardRef, useImperativeHandle } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray } from 'react-hook-form';
import * as z from 'zod';
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
import { Button } from '@/components/ui/button';
import { FormSectionRef } from '@/../types/formsRefs';

// Define two separate schemas - one for when noCrops is false, one for when it's true
const cropSchema = z.object({
  id: z.string().optional(),
  cropName: z.string().min(1, 'Crop name is required'),
  acreage: z.string().min(1, 'Acreage is required'),
});

const cropsFormSchema = z.discriminatedUnion('noCrops', [
  // When noCrops is false (default), validate the crops array
  z.object({
    noCrops: z.literal(false),
    crops: z.array(cropSchema).min(1, 'At least one crop is required'),
    deletedCropIds: z.array(z.string()).optional(),
  }),
  // When noCrops is true, no validation for crops array
  z.object({
    noCrops: z.literal(true),
    crops: z.array(z.any()).optional(),
    deletedCropIds: z.array(z.string()).optional(),
  }),
]);

type CropsFormValues = z.infer<typeof cropsFormSchema>;

interface CropsFormProps {
  onStateChange: (_state: {
    isValid: boolean;
    data: CropsFormValues | null;
  }) => void;
  initialData?: CropsFormValues | null;
}

export const CropsForm = forwardRef<FormSectionRef, CropsFormProps>(
  ({ onStateChange, initialData }, ref) => {
    const form = useForm<CropsFormValues>({
      resolver: zodResolver(cropsFormSchema),
      defaultValues: initialData || {
        noCrops: true,
        crops: [{ cropName: '', acreage: '' }],
        deletedCropIds: [],
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
      name: 'crops',
    });

    const noCrops = form.watch('noCrops');

    // Reset validation errors when noCrops changes
    useEffect(() => {
      form.clearErrors();

      // Update parent state when noCrops changes
      const data = form.getValues();

      const updatedData = {
        ...data,
        deletedCropIds: data.deletedCropIds || [], // Ensure it exists
      };

      const isValid =
        data.noCrops || Object.keys(form.formState.errors).length === 0;

      onStateChange({ isValid, data: updatedData });
    }, [noCrops]);

    // Initial validation check
    useEffect(() => {
      // Check if we have initial data and it's valid
      if (initialData) {
        // Ensure deletedCropIds is included in initial data
        const updatedInitialData = {
          ...initialData,
          deletedCropIds: initialData.deletedCropIds || [], // Ensure it's always present
        };

        // Validate the initial data
        form.trigger().then((isValid) => {
          onStateChange({
            isValid: updatedInitialData.noCrops || isValid,
            data: updatedInitialData,
          });
        });
      } else {
        // Just set the initial data without claiming it's invalid
        const data = form.getValues();
        onStateChange({
          isValid: data.noCrops,
          data: { ...data, deletedCropIds: [] }, // Ensure deletedCropIds is always present
        });
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const validateAllFields = async () => {
      if (!noCrops) {
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
          data.noCrops || Object.keys(form.formState.errors).length === 0;
        onStateChange({ isValid, data });
      });

      return () => subscription.unsubscribe();
    }, [form, onStateChange]);

    const handleDelete = (index: number) => {
      const data = form.getValues();
      if (data.crops) {
        const cropId = data.crops[index].id;

        // ensure deletedcropids exists and add the current id if it has one
        const updatedDeletedCropIds = [
          ...(data.deletedCropIds || []),
          ...(cropId ? [cropId] : []),
        ];

        form.clearErrors(`crops.${index}`);

        // Update form state with removed crops
        form.setValue('deletedCropIds', updatedDeletedCropIds);

        // Remove the crop from the crops array
        const updatedCrops = (data.crops || []).filter(
          (crop) => crop.id !== cropId
        );

        const isValid = updatedCrops.length > 0 || data.noCrops;

        onStateChange({
          isValid,
          data: {
            ...data,
            crops: updatedCrops,
            deletedCropIds: updatedDeletedCropIds, // Ensure deletedCropIds is included
          },
        });
      } else {
        // Else case for when crops is not defined or index is invalid
        console.warn('Invalid index or crops data is undefined.');

        // If no crops, set deletedCropIds to empty array (or handle as needed)
        const updatedDeletedCropIds = data.deletedCropIds || [];

        // Pass updated data to parent
        onStateChange({
          isValid: true, // Set isValid based on your specific use case
          data: {
            ...data,
            deletedCropIds: updatedDeletedCropIds,
          },
        });
      }
    };

    return (
      <Card>
        <CardHeader>
          <CardTitle>Crops Information</CardTitle>
          <CardDescription>
            Tell us about the crops you grow on your property.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form>
            <CardContent className='space-y-6'>
              <FormField
                control={form.control}
                name='noCrops'
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
                      <FormLabel>I do not grow crops on my property</FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              {!noCrops && (
                <div className='space-y-4'>
                  <div className='rounded-md border p-4'>
                    <div className='font-medium'>Crop List</div>
                    <p className='text-sm text-muted-foreground'>
                      Add all the crops you grow on your farm.
                    </p>

                    <div className='mt-4 space-y-4'>
                      {fields.map((field, index) => (
                        <div
                          key={field.id}
                          className='grid grid-cols-1 gap-4 rounded-lg border p-4 md:grid-cols-12'
                        >
                          <FormField
                            control={form.control}
                            name={`crops.${index}.cropName`}
                            render={({ field }) => (
                              <FormItem className='md:col-span-5'>
                                <FormLabel>Crop Name</FormLabel>
                                <FormControl>
                                  <Input placeholder='Corn' {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`crops.${index}.acreage`}
                            render={({ field }) => (
                              <FormItem className='md:col-span-3'>
                                <FormLabel>Acres of Crop</FormLabel>
                                <FormControl>
                                  <Input placeholder='100' {...field} />
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
                      onClick={() => append({ cropName: '', acreage: '' })}
                    >
                      <Plus className='mr-2 h-4 w-4' />
                      Add Crop
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

CropsForm.displayName = 'CropsForm';
