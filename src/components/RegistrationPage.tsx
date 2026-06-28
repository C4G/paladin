'use client';

import type React from 'react';

import { useState, useEffect, useRef } from 'react';
import { ProfileForm } from '@/components/registration/profile-form';
import { FarmDetailsForm } from '@/components/registration/farm-details-form';
import { CropsForm } from '@/components/registration/crops-form';
import { LivestockForm } from '@/components/registration/livestock-form';
import { EquipmentForm } from '@/components/registration/equipment-form';
import { EmergencyNeedsForm } from '@/components/registration/emergency-needs-form';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Check, AlertCircle, X, ChevronDown } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useSession } from 'next-auth/react';
import type { Session } from 'next-auth';
import { useRouter } from 'next/navigation';
import { FormSectionRef } from '@/../types/formsRefs';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { DonateDialog } from '@/components/donate-dialog';

interface FarmDetailsData {
  farmName: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  lat: number;
  lng: number;
  totalAcreage: string;
  yearEstablished: string;
  otherInfo?: string;
  gates?: { name: string; latitude: number; longitude: number }[];
}

interface ProfileData {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email: string;
  emailNotifications: boolean;
  bio?: string;
}

interface CropsData {
  noCrops: boolean | false;
  crops: { cropName: string; acreage: string }[]; // Array of crop objects
}

interface LivestockData {
  noLivestock: boolean;
  livestock: {
    animalType: string;
    count: string;
  }[];
}

interface EquipmentData {
  noEquipment: boolean;
  equipment: {
    equipmentType: string;
    description: string;
  }[];
}

interface EmergencyNeedsData {
  noNeeds: boolean;
  emergencyNeeds: {
    equipmentType: string;
    details: string;
  }[];
}

export interface FormState<T = any> {
  isValid: boolean;
  data: T | null;
}

// Update the FormStates interface - removed gates as it's now part of farm-details
export interface FormStates {
  profile: FormState;
  'farm-details': FormState<FarmDetailsData>;
  crops: FormState<CropsData>;
  livestock: FormState<LivestockData>;
  equipment: FormState<EquipmentData>;
  emergencyNeeds: FormState<EmergencyNeedsData>;
}

export default function RegistrationPage() {
  const router = useRouter();
  // Add a state variable to track form submission
  const { data: session } = useSession();
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formStates, setFormStates] = useState<FormStates>({
    profile: { isValid: false, data: null },
    'farm-details': { isValid: false, data: null },
    crops: { isValid: false, data: null },
    livestock: { isValid: false, data: null },
    equipment: { isValid: false, data: null },
    emergencyNeeds: { isValid: false, data: null },
  });
  const [activeTab, setActiveTab] = useState({
    id: 'profile',
    label: 'Profile',
  });
  const [showDonateDialog, setShowDonateDialog] = useState(false);
  const [alertInfo, setAlertInfo] = useState<{
    show: boolean;
    title: string;
    description: string;
    variant: 'default' | 'destructive';
  }>({
    show: false,
    title: '',
    description: '',
    variant: 'default',
  });

  const cropsRef = useRef<FormSectionRef>(null);
  const livestockRef = useRef<FormSectionRef>(null);
  const equipmentRef = useRef<FormSectionRef>(null);
  const emergencyNeedsRef = useRef<FormSectionRef>(null);

  // Updated tabs array - removed gates tab
  const tabs = [
    { id: 'profile', label: 'Profile' },
    { id: 'farm-details', label: 'Farm Details' },
    { id: 'crops', label: 'Crops' },
    { id: 'livestock', label: 'Livestock' },
    { id: 'equipment', label: 'Equipment' },
    { id: 'emergencyNeeds', label: 'Emergency Needs' },
  ];

  useEffect(() => {
    const fetchUserData = async () => {
      if (!session) {
        return;
      }

      try {
        const userID = (session as Session).user.id!;
        const userResponse = await fetch(
          `/api/users?userId=${userID}&reqType=registration`
        );

        if (!userResponse.ok) {
          throw new Error('Failed to fetch profile data');
        }

        const userData = await userResponse.json();

        // Transform the data to match the form structure
        const user = userData;

        // Set profile data
        setFormStates((prev) => ({
          ...prev,
          profile: {
            isValid: true,
            data: {
              firstName: user.name?.split(' ')[0] || '',
              lastName: user.name?.split(' ')[1] || '',
              email: user.email || '',
              phoneNumber: user.phoneNumber || '',
              bio: user.bio || '',
              emailNotifications: user.emailNotifications ?? true,
            },
          },
        }));
      } catch (err) {
        console.error('Error retrieving user info:', err);
      }
    };

    fetchUserData();
  }, [session]);

  // Update the updateFormState function to remove isVisited
  const updateFormState = (tabId: string, state: Partial<FormState>) => {
    setFormStates((prev) => {
      // Only update if there's an actual change to prevent unnecessary re-renders
      const currentState = prev[tabId as keyof FormStates];
      const isValidChanged =
        state.isValid !== undefined && state.isValid !== currentState.isValid;
      const dataChanged =
        state.data !== undefined &&
        JSON.stringify(state.data) !== JSON.stringify(currentState.data);

      // If nothing changed, return the previous state
      if (!isValidChanged && !dataChanged) {
        return prev;
      }

      // Otherwise, update the state
      return {
        ...prev,
        [tabId]: {
          ...currentState,
          ...state,
        },
      };
    });
  };

  const handleTabChange = (tabId: string) => {
    const newTab = tabs.find((tab) => tab.id === tabId);
    if (newTab) {
      setActiveTab(newTab);
    }
  };

  // Navigate to next tab
  const handleNextTab = () => {
    const currentIndex = tabs.findIndex((tab) => tab.id === activeTab.id);
    if (currentIndex < tabs.length - 1) {
      const nextTabId = tabs[currentIndex + 1].id;
      handleTabChange(nextTabId);
    }
  };

  // Navigate to previous tab
  const handlePreviousTab = () => {
    const currentIndex = tabs.findIndex((tab) => tab.id === activeTab.id);
    if (currentIndex > 0) {
      const prevTabId = tabs[currentIndex - 1].id;
      handleTabChange(prevTabId);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    // Prevent multiple submissions
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    // Set form as submitted to show validation indicators
    setFormSubmitted(true);

    try {
      const [
        cropsIsValid,
        livestockIsValid,
        equipmentIsValid,
        emergencyNeedsIsValid,
      ] = await Promise.all([
        cropsRef.current?.triggerValidation?.(),
        livestockRef.current?.triggerValidation?.(),
        equipmentRef.current?.triggerValidation?.(),
        emergencyNeedsRef.current?.triggerValidation?.(),
      ]);

      // Manually check if forms are valid based on current state
      const profileIsValid = formStates.profile.isValid;
      const farmDetailsIsValid = formStates['farm-details'].isValid;

      // All forms are valid if all required forms are valid
      const allFormsValid =
        profileIsValid &&
        farmDetailsIsValid &&
        cropsIsValid &&
        livestockIsValid &&
        equipmentIsValid &&
        emergencyNeedsIsValid;

      // If all valid, submit the form
      if (allFormsValid) {
        // Show success alert
        setAlertInfo({
          show: true,
          title: 'Registration Complete',
          description: 'Your farm profile has been successfully submitted.',
          variant: 'default',
        });

        // write form to database
        try {
          const profile: ProfileData = formStates.profile.data;
          const farmDetails: FarmDetailsData = formStates['farm-details']
            .data as FarmDetailsData;
          const crop: CropsData | null = formStates.crops.data;
          const livestock: LivestockData | null = formStates.livestock.data;
          const equipment: EquipmentData | null = formStates.equipment.data;
          const emergencyNeeds: EmergencyNeedsData | null =
            formStates.emergencyNeeds.data;

          const formData = {
            profile: profile,
            farmDetails: farmDetails,
            crops: crop,
            livestock: livestock,
            equipment: equipment,
            emergencyNeeds: emergencyNeeds,
          };

          // profile
          const profileName = `${formData.profile.firstName} ${formData.profile.lastName}`;
          const profileResponse = await fetch('/api/users', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: profileName,
              phoneNumber: formData.profile.phoneNumber,
              bio: formData.profile.bio || '',
              emailNotifications: formData.profile.emailNotifications ?? true,
            }),
          });

          if (!profileResponse.ok) {
            const errorBody = await profileResponse.json().catch(() => ({}));
            console.error('Profile submit error:', errorBody);
            throw new Error(
              `Failed to submit request: ${JSON.stringify(errorBody)}`
            );
          }

          // farm
          //const farmAddress = `${formData.farmDetails.address}, ${formData.farmDetails.city}, ${formData.farmDetails.state}, ${formData.farmDetails.zipCode}`;
          const farmResponse = await fetch('/api/farms', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              ...formData,
              name: formData.farmDetails.farmName,
              streetAddress: formData.farmDetails.address,
              city: formData.farmDetails.city,
              state: formData.farmDetails.state,
              zipcode: formData.farmDetails.zipCode,
              latitude: formData.farmDetails.lat,
              longitude: formData.farmDetails.lng,
              otherInfo: formData.farmDetails.otherInfo,
              totalAcreage: formData.farmDetails.totalAcreage,
              yearEstablished: formData.farmDetails.yearEstablished,
              userId: (session as Session).user.id!,
            }),
          });

          if (!farmResponse.ok) {
            throw new Error(`Failed to submit request:${farmResponse.ok}`);
          }

          const farmData = await farmResponse.json();
          const farmId = farmData.id;

          //crops
          if (formData.crops && !formData.crops.noCrops) {
            for (const crop of formData.crops.crops) {
              const cropResponse = await fetch('/api/crops', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  ...formData,
                  farmId: farmId,
                  name: crop.cropName,
                  acreage: crop.acreage,
                }),
              });

              if (!cropResponse.ok) {
                throw new Error('Failed to submit crop data');
              }
            }
          }

          // gates - now part of farmDetails
          if (
            formData.farmDetails.gates &&
            formData.farmDetails.gates.length > 0
          ) {
            try {
              const validGates = formData.farmDetails.gates.filter(
                (gate) => gate.latitude && gate.longitude
              );

              if (validGates.length > 0) {
                // Submit all gates at once
                const gatesResponse = await fetch('/api/gates', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    farmId: farmId,
                    gates: validGates,
                  }),
                });

                if (!gatesResponse.ok) {
                  throw new Error('Failed to submit gates data');
                }
              } else {
                console.warn('No valid gates with coordinates to submit');
              }
            } catch (error) {
              console.error('Error submitting gates:', error);
              setAlertInfo({
                show: true,
                title: 'Error',
                description: 'Failed to submit gates data. Please try again.',
                variant: 'destructive',
              });
              setIsSubmitting(false);
              return;
            }
          }

          //livestock
          if (formData.livestock && !formData.livestock.noLivestock) {
            for (const livestock of formData.livestock.livestock) {
              const livestockResponse = await fetch('/api/livestocks', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  ...formData,
                  farmId: farmId,
                  name: livestock.animalType,
                  count: livestock.count,
                }),
              });

              if (!livestockResponse.ok) {
                throw new Error('Failed to submit livestock data');
              }
            }
          }

          // equipment
          if (formData.equipment && !formData.equipment.noEquipment) {
            for (const equipment of formData.equipment.equipment) {
              const equipmentResponse = await fetch('/api/equipments', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  ...formData,
                  farmId: farmId,
                  type: equipment.equipmentType,
                  description: equipment.description,
                }),
              });

              if (!equipmentResponse.ok) {
                throw new Error('Failed to submit equipment data');
              }
            }
          }

          // Emergency Needs
          if (formData.emergencyNeeds && !formData.emergencyNeeds.noNeeds) {
            for (const emergencyNeeds of formData.emergencyNeeds
              .emergencyNeeds) {
              const emergencyNeedsResponse = await fetch(
                '/api/emergencyNeeds',
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    ...formData,
                    farmId: farmId,
                    type: emergencyNeeds.equipmentType,
                    details: emergencyNeeds.details,
                  }),
                }
              );

              if (!emergencyNeedsResponse.ok) {
                throw new Error('Failed to submit emergency need data');
              }
            }
          }

          setShowDonateDialog(true);
        } catch (error) {
          console.error('Submission error:', error);
          alert(`Failed to write data to database:${error}`);
        }
      } else {
        // Find which tabs are invalid
        const invalidTabs = [];
        if (!profileIsValid) {
          const profileTab = tabs.find((t) => t.id === 'profile');
          if (profileTab) {
            invalidTabs.push(profileTab);
          }
        }
        if (!farmDetailsIsValid) {
          const farmTab = tabs.find((t) => t.id === 'farm-details');
          if (farmTab) {
            invalidTabs.push(farmTab);
          }
        }
        if (!cropsIsValid) {
          const cropTab = tabs.find((t) => t.id === 'crops');
          if (cropTab) {
            invalidTabs.push(cropTab);
          }
        }
        if (!livestockIsValid) {
          const livestockTab = tabs.find((t) => t.id === 'livestock');
          if (livestockTab) {
            invalidTabs.push(livestockTab);
          }
        }
        if (!equipmentIsValid) {
          const equipmentTab = tabs.find((t) => t.id === 'equipment');
          if (equipmentTab) {
            invalidTabs.push(equipmentTab);
          }
        }
        if (!emergencyNeedsIsValid) {
          const emergencyNeedsTab = tabs.find((t) => t.id === 'emergencyNeeds');
          if (emergencyNeedsTab) {
            invalidTabs.push(emergencyNeedsTab);
          }
        }

        if (invalidTabs.length > 0) {
          // Switch to the first invalid tab
          setActiveTab({ id: invalidTabs[0].id, label: invalidTabs[0].label });

          // Show alert
          setAlertInfo({
            show: true,
            title: 'Please complete all required information',
            description: `There are issues in the ${invalidTabs
              .map((t) => t.label)
              .join(', ')} section${invalidTabs.length > 1 ? 's' : ''}.`,
            variant: 'destructive',
          });
        }
      }
    } catch (error) {
      console.error('Error during form validation:', error);
      setAlertInfo({
        show: true,
        title: 'An error occurred',
        description:
          'There was a problem validating your form. Please try again.',
        variant: 'destructive',
      });
    }

    setIsSubmitting(false);
  };

  return (
    <div className='container mx-auto max-w-5xl py-10'>
      <div className='mb-8 space-y-4'>
        <h1 className='flex justify-center text-xl font-bold md:block md:text-3xl'>
          Complete Your Farm Profile
        </h1>
        <p className='hidden text-muted-foreground md:block'>
          Please provide all the required information about your farm or ranch.
          You can navigate between sections freely and submit when complete.
        </p>
      </div>

      {alertInfo.show && (
        <Alert variant={alertInfo.variant} className='relative mb-6'>
          <Button
            variant='ghost'
            size='icon'
            className='absolute right-2 top-2 h-6 w-6 p-0'
            onClick={() => setAlertInfo({ ...alertInfo, show: false })}
          >
            <X className='h-4 w-4' />
          </Button>
          {alertInfo.variant === 'destructive' ? (
            <AlertCircle className='h-4 w-4' />
          ) : (
            <Check className='h-4 w-4' />
          )}
          <AlertTitle>{alertInfo.title}</AlertTitle>
          <AlertDescription>{alertInfo.description}</AlertDescription>
        </Alert>
      )}

      <Tabs
        value={activeTab.id}
        onValueChange={handleTabChange}
        className='w-full'
      >
        {/* Desktop tabs */}
        <TabsList className='hidden w-full grid-cols-6 md:grid'>
          {tabs.map((tab) => {
            const state = formStates[tab.id as keyof FormStates];
            let showError = false;
            let showCheck = false;

            // Only show indicators if the form has been submitted
            if (formSubmitted) {
              // For optional sections, they're valid if the "no" checkbox is checked or if the form is valid
              if (tab.id === 'crops') {
                showCheck = state.data?.noCrops === true || state.isValid;
                showError = !showCheck;
              } else if (tab.id === 'livestock') {
                showCheck = state.data?.noLivestock === true || state.isValid;
                showError = !showCheck;
              } else if (tab.id === 'equipment') {
                showCheck = state.data?.noEquipment === true || state.isValid;
                showError = !showCheck;
              } else if (tab.id === 'emergencyNeeds') {
                showCheck = state.data?.noNeeds === true || state.isValid;
                showError = !showCheck;
              } else {
                // For required sections, they're valid if the form is valid
                showCheck = state.isValid;
                showError = !state.isValid;
              }
            }

            return (
              <TabsTrigger key={tab.id} value={tab.id} className='relative'>
                {showCheck && (
                  <Check className='absolute -right-1 -top-1 h-4 w-4 text-green-500' />
                )}
                {showError && (
                  <AlertCircle className='absolute -right-1 -top-1 h-4 w-4 text-red-500' />
                )}
                {tab.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <div className='mt-8'>
          {/* Mobile dropdown */}
          <div className='flex justify-end md:hidden'>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant='outline' className='pr-2'>
                  {activeTab.label}
                  <ChevronDown className='pt-0.5 text-black dark:text-white' />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <>
                  {tabs.map((tab) => (
                    <DropdownMenuItem
                      key={tab.id}
                      onClick={() => handleTabChange(tab.id)}
                    >
                      {tab.label}
                    </DropdownMenuItem>
                  ))}
                </>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <TabsContent
            value='profile'
            forceMount
            className='hidden data-[state=active]:block'
          >
            <ProfileForm
              onStateChange={(state) => updateFormState('profile', state)}
              initialData={formStates.profile.data}
            />
            <div className='mt-6 flex justify-end'>
              <Button onClick={handleNextTab} variant='outline'>
                Next
              </Button>
            </div>
          </TabsContent>

          <TabsContent
            value='farm-details'
            forceMount
            className='hidden data-[state=active]:block'
          >
            <FarmDetailsForm
              onStateChange={(state) => updateFormState('farm-details', state)}
              initialData={formStates['farm-details'].data}
            />
            <div className='mt-6 flex justify-between'>
              <Button variant='outline' onClick={handlePreviousTab}>
                Previous
              </Button>
              <Button onClick={handleNextTab} variant='outline'>
                Next
              </Button>
            </div>
          </TabsContent>

          <TabsContent
            value='crops'
            forceMount
            className='hidden data-[state=active]:block'
          >
            <CropsForm
              ref={cropsRef}
              onStateChange={(state) => updateFormState('crops', state)}
              initialData={formStates.crops.data}
            />
            <div className='mt-6 flex justify-between'>
              <Button variant='outline' onClick={handlePreviousTab}>
                Previous
              </Button>
              <Button onClick={handleNextTab} variant='outline'>
                Next
              </Button>
            </div>
          </TabsContent>

          <TabsContent
            value='livestock'
            forceMount
            className='hidden data-[state=active]:block'
          >
            <LivestockForm
              ref={livestockRef}
              onStateChange={(state) => updateFormState('livestock', state)}
              initialData={formStates.livestock.data}
            />
            <div className='mt-6 flex justify-between'>
              <Button variant='outline' onClick={handlePreviousTab}>
                Previous
              </Button>
              <Button onClick={handleNextTab} variant='outline'>
                Next
              </Button>
            </div>
          </TabsContent>

          <TabsContent
            value='equipment'
            forceMount
            className='hidden data-[state=active]:block'
          >
            <EquipmentForm
              ref={equipmentRef}
              onStateChange={(state) => updateFormState('equipment', state)}
              initialData={formStates.equipment.data}
            />
            <div className='mt-6 flex justify-between'>
              <Button variant='outline' onClick={handlePreviousTab}>
                Previous
              </Button>
              <Button onClick={handleNextTab} variant='outline'>
                Next
              </Button>
            </div>
          </TabsContent>

          <TabsContent
            value='emergencyNeeds'
            forceMount
            className='hidden data-[state=active]:block'
          >
            <EmergencyNeedsForm
              ref={emergencyNeedsRef}
              onStateChange={(state) =>
                updateFormState('emergencyNeeds', state)
              }
              initialData={formStates.emergencyNeeds.data}
            />
            <div className='mt-6 flex justify-between'>
              <Button variant='outline' onClick={handlePreviousTab}>
                Previous
              </Button>
            </div>
          </TabsContent>
        </div>
      </Tabs>

      <div className='mt-8 flex justify-center'>
        <Button
          size='lg'
          className='w-full bg-gray-900 px-8 font-bold text-white hover:bg-gray-800 focus:ring-2 focus:ring-gray-600'
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Validating...' : 'Complete Registration'}
        </Button>
      </div>

      <DonateDialog
        open={showDonateDialog}
        onOpenChange={(open) => {
          setShowDonateDialog(open);
          if (!open) router.push('/dashboard');
        }}
      />
    </div>
  );
}
