'use client';

import { useState, useEffect, useRef } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

// Extend Window interface to include custom validation function
declare global {
  // eslint-disable-next-line no-unused-vars
  interface Window {
    validateFarmDetailsForm?: () => Promise<{ isValid: boolean; errors?: any }>;
  }
}
import { Input } from '@/components/ui/input';
import GoogleMapComponent from '../GoogleMapComponent';
import { Marker } from '@react-google-maps/api';
import { Textarea } from '@/components/ui/textarea';
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
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useGoogleMaps } from '../providers/GoogleMapsProvider';

// Define the Google Maps address component type
interface GoogleMapsAddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

// Define the Gate interface
interface Gate {
  id?: string;
  name: string;
  latitude: number;
  longitude: number;
}

const farmDetailsSchema = z.object({
  farmName: z.string().min(1, 'Farm name is required'),
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  zipCode: z.string().min(5, 'Valid zip code is required'),
  lat: z.number().optional(),
  lng: z.number().optional(),
  totalAcreage: z.string().optional(),
  yearEstablished: z.string().optional(),
  otherInfo: z.string().optional(),
  gates: z
    .array(
      z.object({
        id: z.string().optional(),
        name: z.string(),
        latitude: z.number(),
        longitude: z.number(),
      })
    )
    .optional(),
  deletedGateIds: z.array(z.string()).optional(),
});

type FarmDetailsFormValues = z.infer<typeof farmDetailsSchema>;

// Add this type definition after the FarmDetailsFormValues type
type FarmDetailsFormFields = keyof FarmDetailsFormValues;

interface FarmDetailsFormProps {
  onStateChange: (_state: {
    isValid: boolean;
    data: FarmDetailsFormValues | null;
  }) => void;
  initialData?: FarmDetailsFormValues | null;
}

export function FarmDetailsForm({
  onStateChange,
  initialData,
}: FarmDetailsFormProps) {
  const [mapCenter, setMapCenter] = useState({ lat: 33.7511, lng: -84.3907 });
  const [mapZoom, setMapZoom] = useState(12);
  const [addressInput, setAddressInput] = useState('');
  const [gates, setGates] = useState<Gate[]>([]);
  const [isAddingGate, setIsAddingGate] = useState(false);
  const [newGateName, setNewGateName] = useState('');
  const [isGateDialogOpen, setIsGateDialogOpen] = useState(false);
  const [gateMarkers, setGateMarkers] = useState<google.maps.Marker[]>([]);
  const { isLoaded } = useGoogleMaps();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const form = useForm<FarmDetailsFormValues>({
    resolver: zodResolver(farmDetailsSchema),
    defaultValues: initialData || {
      farmName: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      lat: 33.7511,
      lng: -84.3907,
      totalAcreage: '',
      yearEstablished: '',
      otherInfo: '',
      gates: [],
    },
    mode: 'onTouched',
  });

  // Initial validation check
  useEffect(() => {
    // Check if we have initial data and it's valid
    if (initialData) {
      // Initialize gates from initial data if available
      if (initialData.gates && initialData.gates.length > 0) {
        setGates(initialData.gates);
      }
      if (initialData.lat && initialData.lng) {
        setMapCenter({ lat: initialData.lat, lng: initialData.lng });
        setMapZoom(15);
      }

      // Validate the initial data
      form.trigger().then((isValid) => {
        onStateChange({ isValid, data: initialData });
      });
    } else {
      // Just set the initial data without claiming it's invalid
      const data = form.getValues();
      onStateChange({ isValid: false, data });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // validate field and update value on blur
  const handleFieldBlur = async (fieldName: FarmDetailsFormFields) => {
    // ONLY validate this specific field, not all fields
    await form.trigger(fieldName);

    // Update parent state with current form values and validity
    const data = form.getValues();
    // Add gates to the form data
    data.gates = gates;
    const isValid = Object.keys(form.formState.errors).length === 0;
    onStateChange({ isValid, data });
  };

  // Replace the validateAllFields function with this simpler version
  const validateAllFields = async () => {
    // Force validation for all fields
    const result = await form.trigger();

    // Get the current form values
    const data = form.getValues();
    // Add gates to the form data
    data.gates = gates;

    // Update parent state with validation result
    onStateChange({ isValid: result, data });

    return { isValid: result, errors: form.formState.errors };
  };

  // Expose the validation method to the parent component
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.validateFarmDetailsForm = validateAllFields;
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete window.validateFarmDetailsForm;
      }
    };
  }, []);

  // initialize autocomplete on search address field with google maps provider
  useEffect(() => {
    if (isLoaded && window.google && inputRef.current) {
      // Initialize Autocomplete when the API is loaded and input element is available
      const autocomplete = new google.maps.places.Autocomplete(
        inputRef.current!,
        {
          fields: ['formatted_address', 'geometry', 'address_components'],
        }
      );

      autocomplete.addListener('place_changed', async () => {
        const place = autocomplete.getPlace();

        if (!place.geometry || !place.geometry.location) {
          console.error('No location data for this place');
          return;
        }

        // Update map position
        setMapCenter({
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        });
        setMapZoom(15);

        // Extract address components
        const addressComponents = {
          street_number: '',
          route: '',
          locality: '',
          administrative_area_level_1: '',
          postal_code: '',
        };

        if (place.address_components) {
          place.address_components.forEach(
            (component: GoogleMapsAddressComponent) => {
              console.log(component);
              const types = component.types;

              if (types.includes('street_number')) {
                addressComponents.street_number = component.long_name;
              }
              if (types.includes('route')) {
                addressComponents.route = component.long_name;
              }
              if (types.includes('locality')) {
                addressComponents.locality = component.long_name;
              }
              if (types.includes('administrative_area_level_1')) {
                addressComponents.administrative_area_level_1 =
                  component.short_name;
              }
              if (types.includes('postal_code')) {
                addressComponents.postal_code = component.long_name;
              }
            }
          );
        }

        const setValueOpts = {
          shouldValidate: true,
          shouldTouch: true,
          shouldDirty: true,
        };

        // Update form values
        form.setValue(
          'address',
          `${addressComponents.street_number} ${addressComponents.route}`.trim(),
          setValueOpts
        );
        form.setValue('city', addressComponents.locality, setValueOpts);
        form.setValue(
          'state',
          addressComponents.administrative_area_level_1,
          setValueOpts
        );
        form.setValue('zipCode', addressComponents.postal_code, setValueOpts);

        // Set lat and lng values
        form.setValue('lat', place.geometry.location.lat());
        form.setValue('lng', place.geometry.location.lng());

        // Update the address input field
        setAddressInput(place.formatted_address || '');

        // Re-validate and update parent state
        const allValid = await form.trigger();
        const data = form.getValues();
        data.gates = gates;
        onStateChange({ isValid: allValid, data });
      });
    }
  }, [isLoaded]);

  // Reference to the map instance
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);

  // Set listener for adding gate on map
  useEffect(() => {
    if (isLoaded && mapRef.current) {
      // Add click listener for adding gates if in adding mode
      const clickListener = mapRef.current.addListener(
        'click',
        (e: google.maps.MapMouseEvent) => {
          if (isAddingGate && e.latLng) {
            setIsGateDialogOpen(true);
            const newGatePosition = {
              lat: e.latLng.lat(),
              lng: e.latLng.lng(),
            };

            // Store the position temporarily
            mapRef.current?.panTo(newGatePosition);

            // We'll create the actual gate marker after the user provides a name
            const tempMarker = new window.google.maps.Marker({
              position: newGatePosition,
              map: mapRef.current,
              icon: {
                url: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png',
              },
              animation: window.google.maps.Animation.BOUNCE,
            });

            // Store the temporary marker to remove it later
            setGateMarkers((prev) => [...prev, tempMarker]);
          }
        }
      );

      // clean up listener so there isnt an ever increasing number running
      return () => {
        if (mapRef.current) {
          google.maps.event.removeListener(clickListener);
        }
      };
    }
  }, [isAddingGate]);

  // Update map when center or zoom changes
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setCenter(mapCenter);
      mapRef.current.setZoom(mapZoom);

      // Update marker position
      if (markerRef.current) {
        markerRef.current.setPosition(mapCenter);
      } else if (window.google?.maps?.Marker && mapRef.current) {
        // Create marker if it doesn't exist yet
        markerRef.current = new window.google.maps.Marker({
          position: mapCenter,
          map: mapRef.current,
        });
      }
    }
  }, [mapCenter, mapZoom]);

  // Add gate markers to the map when gates change
  useEffect(() => {
    // Clear existing gate markers
    gateMarkers.forEach((marker) => marker.setMap(null));

    if (mapRef.current && isLoaded) {
      const newMarkers: google.maps.Marker[] = [];

      gates.forEach((gate) => {
        const marker = new window.google.maps.Marker({
          position: { lat: gate.latitude, lng: gate.longitude },
          map: mapRef.current,
          title: gate.name,
          icon: {
            url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
          },
        });

        // Add info window for the gate
        const infoWindow = new window.google.maps.InfoWindow({
          content: `<div><strong>${gate.name}</strong></div>`,
        });

        marker.addListener('click', () => {
          infoWindow.open(mapRef.current, marker);
        });

        newMarkers.push(marker);
      });

      setGateMarkers(newMarkers);
    }
  }, [gates, isLoaded]);

  // Function to add a new gate
  const addGate = () => {
    if (!mapRef.current) return;

    // Get the current center of the map
    const center = mapRef.current.getCenter();
    if (!center) return;

    const newGate: Gate = {
      name: newGateName,
      latitude: center.lat(),
      longitude: center.lng(),
    };

    // Add the new gate to the gates array
    const updatedGates = [...gates, newGate];
    setGates(updatedGates);

    // Clear temporary markers
    gateMarkers.forEach((marker) => {
      if (marker.getAnimation() === window.google.maps.Animation.BOUNCE) {
        marker.setMap(null);
      }
    });

    // Update form data
    const data = form.getValues();
    data.gates = updatedGates;
    onStateChange({
      isValid: Object.keys(form.formState.errors).length === 0,
      data,
    });

    // Reset state
    setNewGateName('');
    setIsGateDialogOpen(false);
    setIsAddingGate(false);
  };

  // deleting a gate
  const deleteGate = (index: number) => {
    // Get the gate ID before filtering
    const gateId = gates[index]?.id; // Use optional chaining to handle undefined id

    // Remove the gate from the gates array
    const updatedGates = gates.filter((_, i) => i !== index);
    setGates(updatedGates);

    // Update form data
    const data = form.getValues();
    data.gates = updatedGates;

    // Only add to deletedGateIds if gateId is defined
    if (gateId) {
      data.deletedGateIds = [...(data.deletedGateIds || []), gateId];
    }

    // Trigger onStateChange with updated data
    onStateChange({
      isValid: Object.keys(form.formState.errors).length === 0,
      data,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Property Details</CardTitle>
        <CardDescription>
          Tell us about your farm or ranch. This information helps us understand
          your operation.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form>
          <CardContent>
            <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
              {/* Left column - Form fields */}
              <div className='space-y-4'>
                <FormField
                  control={form.control}
                  name='farmName'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Farm/Ranch Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder='Green Acres Farm'
                          {...field}
                          onBlur={() => handleFieldBlur('farmName')}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Google Places Autocomplete */}
                <div className='space-y-2'>
                  <FormLabel
                    htmlFor='address-input'
                    className='text-sm font-medium'
                  >
                    Search Address
                  </FormLabel>
                  <Input
                    ref={inputRef}
                    id='address-input'
                    placeholder='Start typing your address...'
                    value={addressInput}
                    onChange={(e) => setAddressInput(e.target.value)}
                    disabled={!isLoaded}
                  />
                  <p className='text-xs text-muted-foreground'>
                    Type to search and select your address from the dropdown
                  </p>
                </div>

                <FormField
                  control={form.control}
                  name='address'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Street Address</FormLabel>
                      <FormControl>
                        <Input
                          placeholder='123 Farm Road'
                          {...field}
                          onBlur={() => handleFieldBlur('address')}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className='grid grid-cols-3 gap-4'>
                  <FormField
                    control={form.control}
                    name='city'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input
                            placeholder='Atlanta'
                            {...field}
                            onBlur={() => handleFieldBlur('city')}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name='state'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State</FormLabel>
                        <FormControl>
                          <Input
                            placeholder='GA'
                            {...field}
                            onBlur={() => handleFieldBlur('state')}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name='zipCode'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Zip Code</FormLabel>
                        <FormControl>
                          <Input
                            placeholder='12345'
                            {...field}
                            onBlur={() => handleFieldBlur('zipCode')}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className='grid grid-cols-2 gap-4'>
                  <FormField
                    control={form.control}
                    name='totalAcreage'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Total Acreage{' '}
                          <span className='font-normal text-muted-foreground'>
                            (Optional)
                          </span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder='500'
                            type='number'
                            {...field}
                            onBlur={() => handleFieldBlur('totalAcreage')}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name='yearEstablished'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Year Established{' '}
                          <span className='font-normal text-muted-foreground'>
                            (Optional)
                          </span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder='1985'
                            type='number'
                            {...field}
                            onBlur={() => handleFieldBlur('yearEstablished')}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name='otherInfo'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='flex items-center gap-2'>
                        Other Information
                        <span className='text-xs font-normal text-muted-foreground'>
                          (Optional)
                        </span>
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder='Any additional information about your property...'
                          className='min-h-[100px]'
                          {...field}
                          onBlur={() => handleFieldBlur('otherInfo')}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Gates Section */}
              </div>

              {/* Right column - Map */}
              <div>
                <div className='h-[370px] overflow-hidden rounded-md border'>
                  <div className='h-full w-full overflow-hidden rounded-lg shadow-lg'>
                    {mapCenter && (
                      <GoogleMapComponent
                        center={mapCenter}
                        zoom={mapZoom}
                        mapRef={mapRef}
                      >
                        <Marker
                          position={{
                            lat: mapCenter.lat,
                            lng: mapCenter.lng,
                          }}
                          title={`Farm`}
                        />
                      </GoogleMapComponent>
                    )}
                  </div>
                </div>

                <div className='mt-4 space-y-2'>
                  <div className='flex items-center justify-between'>
                    <FormLabel htmlFor='add-gate'>Property Gates</FormLabel>
                    <Button
                      id='add-gate'
                      type='button'
                      variant='outline'
                      size='sm'
                      onClick={() => setIsAddingGate(!isAddingGate)}
                      disabled={
                        mapCenter.lat == 33.7511 && mapCenter.lng == -84.3907
                      }
                      className={
                        isAddingGate
                          ? 'bg-primary px-6 text-primary-foreground hover:bg-primary/90 dark:bg-gray-800'
                          : ''
                      }
                    >
                      <Plus className='mr-1 h-4 w-4' />
                      {isAddingGate ? 'Cancel' : 'Add Gate'}
                    </Button>
                  </div>

                  {isAddingGate && (
                    <p className='text-xs text-muted-foreground'>
                      Click on the map to place a gate marker
                    </p>
                  )}

                  {gates.length > 0 ? (
                    <div className='h-[140px] overflow-y-auto rounded-md border p-2'>
                      <div className='space-y-2'>
                        {gates.map((gate, index) => (
                          <div
                            key={index}
                            className='flex items-center justify-between rounded-md border p-2'
                          >
                            <div>
                              <p className='font-medium'>{gate.name}</p>
                              <p className='text-xs text-muted-foreground'>
                                Lat: {gate.latitude.toFixed(6)}, Lng:{' '}
                                {gate.longitude.toFixed(6)}
                              </p>
                            </div>
                            <Button
                              type='button'
                              variant='ghost'
                              size='sm'
                              onClick={() => deleteGate(index)}
                              className='dark:bg-grey-800 text-destructive hover:bg-destructive/10 hover:text-destructive'
                            >
                              <Trash2 className='h-4 w-4' />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className='text-sm text-muted-foreground'>
                      No gates added yet. Add gates by clicking the &quot;Add
                      Gate&quot; button and then clicking on the map.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </form>
      </Form>

      {/* Gate Name Dialog */}
      <Dialog open={isGateDialogOpen} onOpenChange={setIsGateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Gate</DialogTitle>
            <DialogDescription>
              Enter a name for this gate location
            </DialogDescription>
          </DialogHeader>
          <div className='py-4'>
            <Label htmlFor='gateName'>Gate Name</Label>
            <Input
              id='gateName'
              placeholder='Main Entrance'
              value={newGateName}
              onChange={(e) => setNewGateName(e.target.value)}
              className='mt-2'
            />
          </div>
          <DialogFooter>
            <Button
              className='dark:bg-grey-800'
              variant='outline'
              onClick={() => {
                setIsGateDialogOpen(false);
                setIsAddingGate(false);
                // Remove temporary markers
                gateMarkers.forEach((marker) => {
                  if (
                    marker.getAnimation() ===
                    window.google.maps.Animation.BOUNCE
                  ) {
                    marker.setMap(null);
                  }
                });
              }}
            >
              Cancel
            </Button>
            <Button
              className='mb-2 dark:bg-gray-800 md:mb-0'
              onClick={addGate}
              disabled={!newGateName.trim()}
            >
              Add Gate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
