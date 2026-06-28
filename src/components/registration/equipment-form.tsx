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

const equipmentSchema = z.object({
  equipmentType: z.string().min(1, 'Equipment type is required'),
  description: z.string().min(1, 'Description is required'),
});

const equipmentFormSchema = z.discriminatedUnion('noEquipment', [
  // When noEquipment is false (default), validate the equipment array
  z.object({
    noEquipment: z.literal(false),
    equipment: z
      .array(equipmentSchema)
      .min(1, 'At least one equipment item is required'),
    deletedEquipmentIds: z.array(z.string()).optional(),
  }),
  // When noEquipment is true, no validation for equipment array
  z.object({
    noEquipment: z.literal(true),
    equipment: z.array(z.any()).optional(),
    deletedEquipmentIds: z.array(z.string()).optional(),
  }),
]);

type EquipmentFormValues = z.infer<typeof equipmentFormSchema>;

interface EquipmentFormProps {
  onStateChange: (_state: {
    isValid: boolean;
    data: EquipmentFormValues | null;
  }) => void;
  initialData?: EquipmentFormValues | null;
}

export const EquipmentForm = forwardRef<FormSectionRef, EquipmentFormProps>(
  ({ onStateChange, initialData }, ref) => {
    const form = useForm<EquipmentFormValues>({
      resolver: zodResolver(equipmentFormSchema),
      defaultValues: initialData || {
        noEquipment: true,
        equipment: [{ equipmentType: '', description: '' }],
        deletedEquipmentIds: [],
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
      name: 'equipment',
    });

    const noEquipment = form.watch('noEquipment');

    // Reset validation errors when noEquipment changes
    useEffect(() => {
      form.clearErrors();

      // Update parent state when noEquipment changes
      const data = form.getValues();

      const updatedData = {
        ...data,
        deletedEquipmentIds: data.deletedEquipmentIds || [], // Ensure it exists
      };

      const isValid =
        data.noEquipment || Object.keys(form.formState.errors).length === 0;
      onStateChange({ isValid, data: updatedData });
    }, [noEquipment]);

    // Initial validation check
    useEffect(() => {
      // Check if we have initial data and it's valid
      if (initialData) {
        // Ensure deletedEquipmentIds is included in initial data
        const updatedInitialData = {
          ...initialData,
          deletedEquipmentIds: initialData.deletedEquipmentIds || [], // Ensure it's always present
        };

        // Validate the initial data
        form.trigger().then((isValid) => {
          onStateChange({
            isValid: updatedInitialData.noEquipment || isValid,
            data: updatedInitialData,
          });
        });
      } else {
        // Just set the initial data without claiming it's invalid
        const data = form.getValues();
        onStateChange({
          isValid: data.noEquipment,
          data: { ...data, deletedEquipmentIds: [] }, // Ensure deletedEquipmentIds is always present
        });
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Replace the validateAllFields function with this simpler version
    const validateAllFields = async () => {
      if (!noEquipment) {
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
          data.noEquipment || Object.keys(form.formState.errors).length === 0;
        onStateChange({ isValid, data });
      });

      return () => subscription.unsubscribe();
    }, [form, onStateChange]);

    const handleDelete = (index: number) => {
      const data = form.getValues();
      if (data.equipment) {
        const equipmentId = data.equipment[index].id;

        // ensure deletedcropids exists and add the current id if it has one
        const updatedDeletedEquipmentIds = [
          ...(data.deletedEquipmentIds || []),
          ...(equipmentId ? [equipmentId] : []),
        ];

        form.clearErrors(`equipment.${index}`);

        // Update form state with removed equipment
        form.setValue('deletedEquipmentIds', updatedDeletedEquipmentIds);

        // Remove the equipment from the equipment array
        const updatedEquipment = (data.equipment || []).filter(
          (equipment) => equipment.id !== equipmentId
        );

        const isValid = updatedEquipment.length > 0 || data.noEquipment;

        onStateChange({
          isValid,
          data: {
            ...data,
            equipment: updatedEquipment,
            deletedEquipmentIds: updatedDeletedEquipmentIds, // Ensure deletedEquipmentIds is included
          },
        });
      } else {
        // Else case for when equipment is not defined or index is invalid
        console.warn('Invalid index or equipment data is undefined.');

        // If no equipment, set deletedEquipmentIds to empty array (or handle as needed)
        const updatedDeletedEquipmentIds = data.deletedEquipmentIds || [];

        // Pass updated data to parent
        onStateChange({
          isValid: true, // Set isValid based on your specific use case
          data: {
            ...data,
            deletedEquipmentIds: updatedDeletedEquipmentIds,
          },
        });
      }
    };

    return (
      <Card>
        <CardHeader>
          <CardTitle>Equipment Information</CardTitle>
          <CardDescription>
            Tell us about the equipment you use on your property.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form>
            <CardContent className='space-y-6'>
              <FormField
                control={form.control}
                name='noEquipment'
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
                        I do not use specialized equipment on my property
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              {!noEquipment && (
                <div className='space-y-4'>
                  <div className='rounded-md border p-4'>
                    <div className='font-medium'>Equipment List</div>
                    <p className='text-sm text-muted-foreground'>
                      Add all the major equipment you use on your property.
                    </p>

                    <div className='mt-4 space-y-4'>
                      {fields.map((field, index) => (
                        <div
                          key={field.id}
                          className='grid grid-cols-1 gap-4 rounded-lg border p-4 md:grid-cols-12'
                        >
                          <FormField
                            control={form.control}
                            name={`equipment.${index}.equipmentType`}
                            render={({ field }) => (
                              <FormItem className='md:col-span-4'>
                                <FormLabel>Equipment Type</FormLabel>
                                <FormControl>
                                  <Input placeholder='Trailer' {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`equipment.${index}.description`}
                            render={({ field }) => (
                              <FormItem className='md:col-span-5'>
                                <FormLabel>Description</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="20' horse trailer"
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
                          description: '',
                          owned: true,
                        })
                      }
                    >
                      <Plus className='mr-2 h-4 w-4' />
                      Add Equipment
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

EquipmentForm.displayName = 'EquipmentForm';
