'use client';

import { useEffect, useRef } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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

const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phoneNumber: z.string().min(10, 'Valid phone number is required'),
  email: z.union([
    z.string().email('Valid email format required'),
    z.string().length(0),
  ]),
  bio: z.string().optional(),
  emailNotifications: z.boolean().default(true),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

// Add this type definition after the ProfileFormValues type
type ProfileFormFields = keyof ProfileFormValues;

interface ProfileFormProps {
  onStateChange: (_state: {
    isValid: boolean;
    data: ProfileFormValues | null;
  }) => void;
  initialData?: ProfileFormValues | null;
}

export function ProfileForm({ onStateChange, initialData }: ProfileFormProps) {
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: initialData || {
      firstName: '',
      lastName: '',
      phoneNumber: '',
      email: '',
      bio: '',
      emailNotifications: true,
    },
  });

  // Initial validation check
  useEffect(() => {
    // Check if we have initial data and it's valid
    if (initialData) {
      // Only run full validation if user has meaningful saved data
      // (returning user). For new users with mostly empty fields, skip
      // validation so errors don't show before the user has interacted.
      const hasExistingData =
        initialData.phoneNumber && initialData.phoneNumber.length > 0;
      if (hasExistingData) {
        form.trigger().then((isValid) => {
          onStateChange({ isValid, data: initialData });
        });
      } else {
        onStateChange({ isValid: false, data: initialData });
      }
    } else {
      // Just set the initial data without claiming it's invalid
      const data = form.getValues();
      onStateChange({ isValid: false, data });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Add this method to the component to expose validation
  const validateAllFields = async () => {
    // Force validation for all fields
    const result = await form.trigger();

    // Get the current form values
    const data = form.getValues();

    // Update parent state with validation result
    onStateChange({ isValid: result, data });

    return result;
  };

  // Expose the validation method to the parent component
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // @ts-expect-error - Adding a custom property to the window object
      window.validateProfileForm = validateAllFields;
    }
    return () => {
      if (typeof window !== 'undefined') {
        // @ts-expect-error - see above
        delete window.validateProfileForm;
      }
    };
  }, []);

  // Update the handleFieldBlur function to properly validate and update state
  const handleFieldBlur = async (fieldName: ProfileFormFields) => {
    // ONLY validate this specific field, not all fields
    await form.trigger(fieldName);

    // Update parent state with current form values and validity
    const data = form.getValues();
    const isValid = Object.keys(form.formState.errors).length === 0;
    onStateChange({ isValid, data });
  };

  // Track whether we've already initialized from fetched data
  const hasInitializedFromFetch = useRef(false);

  useEffect(() => {
    // Only reset the form when real fetched data arrives (has a name from Google auth),
    // not when the parent passes through empty default values.
    const hasFetchedData =
      initialData?.firstName && initialData.firstName.length > 0;
    if (hasFetchedData && !hasInitializedFromFetch.current) {
      hasInitializedFromFetch.current = true;
      form.reset(initialData);

      // Only run full validation if user has meaningful saved data
      // (returning user). For new users with mostly empty fields, skip
      // so errors don't show before the user has interacted.
      const hasExistingData =
        initialData.phoneNumber && initialData.phoneNumber.length > 0;
      if (hasExistingData) {
        form.trigger().then((isValid) => {
          onStateChange({ isValid, data: initialData });
        });
      } else {
        onStateChange({ isValid: false, data: initialData });
      }
    }
  }, [initialData, form, onStateChange]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Personal Profile</CardTitle>
        <CardDescription>
          This is how others will see you on the site.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form>
          <CardContent className='space-y-4'>
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
              <FormField
                control={form.control}
                name='firstName'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='John'
                        {...field}
                        onBlur={() => handleFieldBlur('firstName')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='lastName'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='Doe'
                        {...field}
                        onBlur={() => handleFieldBlur('lastName')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
              <FormField
                control={form.control}
                name='phoneNumber'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='(555) 123-4567'
                        {...field}
                        onBlur={() => handleFieldBlur('phoneNumber')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='email'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='john.doe@example.com'
                        type='email'
                        {...field}
                        onBlur={() => handleFieldBlur('email')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name='bio'
              render={({ field }) => (
                <FormItem>
                  <FormLabel className='flex items-center gap-2'>
                    Bio
                    <span className='text-xs font-normal text-muted-foreground'>
                      (Optional)
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder='Tell us about yourself and your farming experience...'
                      className='min-h-[120px]'
                      {...field}
                      onBlur={() => handleFieldBlur('bio')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='emailNotifications'
              render={({ field }) => (
                <FormItem className='flex flex-row items-start space-x-3 space-y-0'>
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(checked) => {
                        field.onChange(checked);
                        const data = form.getValues();
                        const isValid =
                          Object.keys(form.formState.errors).length === 0;
                        onStateChange({
                          isValid,
                          data: { ...data, emailNotifications: !!checked },
                        });
                      }}
                      className='mt-0.5'
                    />
                  </FormControl>
                  <div className='space-y-1 leading-none'>
                    <FormLabel>Email Notifications</FormLabel>
                    <p className='text-sm text-muted-foreground'>
                      Receive email notifications about request updates,
                      responses, and organization activity.
                    </p>
                  </div>
                </FormItem>
              )}
            />
          </CardContent>
        </form>
      </Form>
    </Card>
  );
}
