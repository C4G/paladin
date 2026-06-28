'use client';

import type React from 'react';
import { useState, useEffect, useRef } from 'react';
import { ProfileForm } from '@/components/registration/profile-form';
import { FarmDetailsForm } from '@/components/registration/farm-details-form';
import { CropsForm } from '@/components/registration/crops-form';
import { LivestockForm } from '@/components/registration/livestock-form';
import { EquipmentForm } from '@/components/registration/equipment-form';
import { EmergencyNeedsForm } from '@/components/registration/emergency-needs-form';
import { ConfirmationDialogue } from '@/components/profile/ConfirmationDialogue';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Check, AlertCircle, X, ChevronDown } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useSession } from 'next-auth/react';
import type { Session } from 'next-auth';
import { FormSectionRef } from '@/../types/formsRefs';

interface ProfileData {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email: string;
  bio?: string;
  emailNotifications?: boolean;
}

interface FarmApiResponse {
  id: string;
  name: string;
  streetAddress: string;
  city: string;
  state: string;
  zipcode: string;
  latitude: number;
  longitude: number;
  totalAcreage: string;
  yearEstablished: string;
  otherInfo?: string;
  gates?: { id?: string; name: string; latitude: number; longitude: number }[];
  crops?: CropsData;
  livestocks?: LivestockData;
  equipments?: EquipmentData;
  emergencyNeeds?: EmergencyNeedsData;
}

interface CropsApi {
  id: string;
  name: string;
  acreage: string;
}

interface LivestockApi {
  id: string;
  name: string;
  count: string;
}

interface EquipmentApi {
  id: string;
  type: string;
  description: string;
}

interface EmergencyNeedsApi {
  id: string;
  type: string;
  details: string;
}

interface FarmDetailsData {
  id: string;
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
  gates?: { id?: string; name: string; latitude: number; longitude: number }[];
  deletedGateIds: string[];
}

interface CropsData {
  noCrops: boolean | false;
  crops: {
    id: string;
    cropName: string;
    acreage: string;
  }[]; // Array of crop objects
  deletedCropIds: string[];
}

interface LivestockData {
  noLivestock: boolean;
  livestock: {
    id: string;
    animalType: string;
    count: string;
  }[];
  deletedLivestockIds: string[];
}

interface EquipmentData {
  noEquipment: boolean;
  equipment: {
    id: string;
    equipmentType: string;
    description: string;
  }[];
  deletedEquipmentIds: string[];
}

interface EmergencyNeedsData {
  noNeeds: boolean;
  emergencyNeeds: {
    id: string;
    equipmentType: string;
    details: string;
  }[];
  deletedNeedIds: string[];
}

export interface FormState<T = any> {
  isValid: boolean;
  data: T | null;
}

// Update the FormStates interface - removed gates as it's now part of farm-details
export interface FormStates {
  profile: FormState;

  farms: {
    'farm-details': FormState<FarmDetailsData>;
    crops: FormState<CropsData>;
    livestock: FormState<LivestockData>;
    equipment: FormState<EquipmentData>;
    emergencyNeeds: FormState<EmergencyNeedsData>;
  }[];
}

export default function ProfilePage() {
  // Add a state variable to track form submission
  const { data: session } = useSession();
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [selectedFarm, setSelectedFarm] = useState('');
  const [selectedFarmIndex, setSelectedFarmIndex] = useState(0);
  const [nextFarmIndex, setNextFarmIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEdited, setIsEdited] = useState(false);
  const [addingFarm, setAddingFarm] = useState(false);
  const firstRenderEdited = useRef(true);
  const hasFetchedData = useRef(false);
  const [showUnsavedChangesWarning, setShowUnsavedChangesWarning] =
    useState(false);
  const [showDeleteFarmWarning, setShowDeleteFarmWarning] = useState(false);
  const [editedWarningAction, setEditedWarningAction] = useState('');
  // Update the initial form states to remove gates as a separate form
  const [formStates, setFormStates] = useState<FormStates>({
    profile: { isValid: false, data: null },
    farms: [
      {
        'farm-details': { isValid: false, data: null },
        crops: { isValid: false, data: null },
        livestock: { isValid: false, data: null },
        equipment: { isValid: false, data: null },
        emergencyNeeds: { isValid: false, data: null },
      },
    ],
  });
  const [activeTab, setActiveTab] = useState({
    id: 'profile',
    label: 'Profile',
  });
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

  const tabs = [
    { id: 'profile', label: 'Profile' },
    { id: 'farm-details', label: 'Farm Details' },
    { id: 'crops', label: 'Crops' },
    { id: 'livestock', label: 'Livestock' },
    { id: 'equipment', label: 'Equipment' },
    { id: 'emergencyNeeds', label: 'Emergency Needs' },
  ];

  // Load in user data
  useEffect(() => {
    if (!session || hasFetchedData.current) {
      return;
    }
    fetchData();
  }, [session]);

  const fetchData = async () => {
    hasFetchedData.current = true;

    try {
      const userID = (session as Session).user.id!;
      const response = await fetch(
        `/api/users?userId=${userID}&reqType=profile`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch profile data');
      }

      const data = await response.json();

      // normalize data into an array to prevent errors when only 1 farm present
      const farmsArray = Array.isArray(data.farms) ? data.farms : [data.farms];

      let formattedFarms; //type
      if (farmsArray.length > 0) {
        // Transform API response into expected state structure
        formattedFarms = farmsArray.map((farm: FarmApiResponse) => ({
          'farm-details': {
            isValid: true,
            data: {
              id: farm.id,
              farmName: farm.name || '',
              address: farm.streetAddress || '',
              city: farm.city || '',
              state: farm.state || '',
              zipCode: farm.zipcode || '',
              lat: farm.latitude || 0,
              lng: farm.longitude || 0,
              totalAcreage: farm.totalAcreage || '',
              yearEstablished: farm.yearEstablished || '',
              otherInfo: farm.otherInfo || '',
              gates: farm.gates || [],
            },
          },
          crops: {
            isValid: true,
            data: {
              noCrops: !Array.isArray(farm.crops) || farm.crops.length === 0,
              crops: Array.isArray(farm.crops)
                ? (farm.crops as Array<CropsApi>).map((crop: CropsApi) => ({
                    id: crop.id,
                    cropName: crop.name || '',
                    acreage: crop.acreage || '',
                  }))
                : [],
              deletedCropIds: [],
            },
          },
          livestock: {
            isValid: true,
            data: {
              noLivestock:
                !Array.isArray(farm.livestocks) || farm.livestocks.length === 0,
              livestock: Array.isArray(farm.livestocks)
                ? (farm.livestocks as Array<LivestockApi>).map(
                    (livestock: LivestockApi) => ({
                      id: livestock.id,
                      animalType: livestock.name || '',
                      count: livestock.count || 0,
                    })
                  )
                : [],
            },
          },
          equipment: {
            isValid: true,
            data: {
              noEquipment:
                !Array.isArray(farm.equipments) || farm.equipments.length === 0,
              equipment: Array.isArray(farm.equipments)
                ? (farm.equipments as Array<EquipmentApi>).map(
                    (equipment: EquipmentApi) => ({
                      id: equipment.id,
                      equipmentType: equipment.type || '',
                      description: equipment.description || '',
                    })
                  )
                : [],
            },
          },
          emergencyNeeds: {
            isValid: true,
            data: {
              noNeeds:
                !Array.isArray(farm.emergencyNeeds) ||
                farm.emergencyNeeds.length === 0,
              emergencyNeeds: Array.isArray(farm.emergencyNeeds)
                ? (farm.emergencyNeeds as Array<EmergencyNeedsApi>).map(
                    (emergencyNeed: EmergencyNeedsApi) => ({
                      id: emergencyNeed.id,
                      equipmentType: emergencyNeed.type || '',
                      details: emergencyNeed.details || '',
                    })
                  )
                : [],
            },
          },
        }));
      } else {
        formattedFarms = [
          {
            'farm-details': { isValid: false, data: null },
            crops: { isValid: false, data: null },
            livestock: { isValid: false, data: null },
            equipment: { isValid: false, data: null },
            emergencyNeeds: { isValid: false, data: null },
          },
        ];
        setAddingFarm(true);
      }
      // Update the state with the formatted farms
      setFormStates((prev) => ({
        ...prev,
        profile: {
          isValid: true,
          data: {
            firstName: data.name?.split(' ')[0] || '',
            lastName: data.name?.split(' ')[1] || '',
            email: data.email || '',
            phoneNumber: data.phoneNumber || '',
            bio: data.bio || '',
            emailNotifications: data.emailNotifications ?? true,
          },
        },
        farms: formattedFarms,
      }));
      if (farmsArray.length > 0) {
        setSelectedFarm(formattedFarms[0]['farm-details'].data.farmName || '');
        setSelectedFarmIndex(0);
      } else {
        setSelectedFarm('New Farm');
        setSelectedFarmIndex(0);
      }
    } catch (err) {
      console.error('Error retrieving user info:', err);
    }
  };

  useEffect(() => {
    if (firstRenderEdited.current) {
      firstRenderEdited.current = false;
      return;
    }
    if (
      !isEdited &&
      editedWarningAction === 'change' &&
      nextFarmIndex !== null
    ) {
      handleFarmChange(nextFarmIndex);
    } else if (!isEdited && editedWarningAction === 'add') {
      handleAddFarm();
    }
  }, [isEdited]);

  //update form data
  const updateFormState = (
    tabId: string,
    state: Partial<FormState>,
    farmIndex?: number // Optional index for farm-related updates
  ) => {
    setFormStates((prev) => {
      if (tabId === 'profile') {
        // Updating the profile section (not farm-specific)
        const currentState = prev.profile;
        const isValidChanged =
          state.isValid !== undefined && state.isValid !== currentState.isValid;
        const dataChanged =
          state.data !== undefined &&
          JSON.stringify(state.data) !== JSON.stringify(currentState.data);

        if (!isValidChanged && !dataChanged) return prev;

        return {
          ...prev,
          profile: {
            ...currentState,
            ...state,
          },
        };
      } else if (farmIndex !== undefined) {
        // Updating a specific farm's tab (farm-details, crops, livestock, equipment, emergency needs)
        if (!prev.farms[farmIndex]) return prev; // Ensure the farm exists

        const currentState =
          prev.farms[farmIndex][tabId as keyof (typeof prev.farms)[0]];
        const isValidChanged =
          state.isValid !== undefined && state.isValid !== currentState.isValid;
        const dataChanged =
          state.data !== undefined &&
          JSON.stringify(state.data) !== JSON.stringify(currentState.data);

        if (!isValidChanged && !dataChanged) return prev;
        if (dataChanged) setIsEdited(true);

        // Create updated farm array
        const updatedFarms = [...prev.farms];
        updatedFarms[farmIndex] = {
          ...updatedFarms[farmIndex],
          [tabId]: {
            ...currentState,
            ...state,
          },
        };

        return {
          ...prev,
          farms: updatedFarms,
        };
      }

      return prev; // No valid update
    });
  };

  // add a blank set of formstate data to end of farms array
  const handleAddFarm = () => {
    if (isEdited) {
      setShowUnsavedChangesWarning(true);
      setEditedWarningAction('add');
      return;
    }
    setFormStates((prev) => ({
      ...prev,
      farms: [
        ...prev.farms,
        {
          'farm-details': { isValid: false, data: null },
          crops: { isValid: false, data: null },
          livestock: { isValid: false, data: null },
          equipment: { isValid: false, data: null },
          emergencyNeeds: { isValid: false, data: null },
        },
      ],
    }));

    // Select the new farm
    setAddingFarm(true);
    setSelectedFarm('New Farm');
    setSelectedFarmIndex(formStates.farms.length);
    setActiveTab({ id: 'farm-details', label: 'Farm Details' });
  };

  const handleFarmChange = (index: number) => {
    if (isEdited) {
      setNextFarmIndex(index);
      setEditedWarningAction('change');
      setShowUnsavedChangesWarning(true);
      return; // Stop the function to prevent farm switching
    }
    setSelectedFarmIndex(index);
    setSelectedFarm(
      formStates.farms[index]['farm-details']?.data?.farmName || 'Unknown Farm'
    );
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

  const handleConfirmSwitch = async () => {
    setIsEdited(false);
    setShowUnsavedChangesWarning(false);
  };

  const handleCancelSwitch = () => {
    setShowUnsavedChangesWarning(false);
  };

  const handleDeleteFarm = async () => {
    setShowDeleteFarmWarning(true);
  };

  const handleConfirmDelete = async () => {
    // delete farm by id if farmid exists for selected farm
    const farmId: string | undefined =
      formStates.farms[selectedFarmIndex]['farm-details'].data?.id;
    if (farmId) {
      const farmResponse = await fetch(`/api/farms?farmId=${farmId}`, {
        method: 'DELETE',
      });

      if (!farmResponse.ok) {
        throw new Error('Failed to delete farm data');
      }
    }
    // if farmId doesn't exist that means the farm is not posted yet, simply refreshing will delete
    // reload page to refresh data without deleted farm
    window.location.reload();
  };

  const handleCancelDelete = () => {
    setShowDeleteFarmWarning(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    // Prevent multiple submissions
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    // Set form as submitted to show validation indicators
    setFormSubmitted(true);

    try {
      const profileIsValid = formStates.profile.isValid;
      const farmDetailsIsValid =
        formStates.farms[selectedFarmIndex]['farm-details'].isValid;

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
          title: 'Changes Saved',
          description: 'Your farm profile has been successfully updated.',
          variant: 'default',
        });

        // write form to database
        try {
          const profile: ProfileData = formStates.profile.data;
          const farmDetails: FarmDetailsData = formStates.farms[
            selectedFarmIndex
          ]['farm-details'].data as FarmDetailsData;
          const crop: CropsData | null =
            formStates.farms[selectedFarmIndex].crops.data;
          const livestock: LivestockData | null =
            formStates.farms[selectedFarmIndex].livestock.data;
          const equipment: EquipmentData | null =
            formStates.farms[selectedFarmIndex].equipment.data;
          const emergencyNeeds: EmergencyNeedsData | null =
            formStates.farms[selectedFarmIndex].emergencyNeeds.data;

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
              email: formData.profile.email,
              phoneNumber: formData.profile.phoneNumber,
              bio: formData.profile.bio || '',
              emailNotifications: formData.profile.emailNotifications ?? true,
            }),
          });

          if (!profileResponse.ok) {
            const errBody = await profileResponse.text();
            throw new Error(`Failed to update profile: ${errBody}`);
          }

          let farmData;

          // if farm id blank, post farm, else patch farm
          if (!formData.farmDetails.id) {
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
            farmData = await farmResponse.json();
          } else {
            const farmResponse = await fetch(
              `/api/farms?farmId=${formData.farmDetails.id}`,
              {
                method: 'PATCH',
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
                }),
              }
            );

            if (!farmResponse.ok) {
              throw new Error(`Failed to submit request:${farmResponse.ok}`);
            }
            farmData = await farmResponse.json();
          }

          const farmId = farmData.id;

          await processGates(formData.farmDetails ?? undefined, farmId);
          await processCrops(formData.crops ?? undefined, farmId);
          await processLivestock(formData.livestock ?? undefined, farmId);
          await processEquipment(formData.equipment ?? undefined, farmId);
          await processEmergencyNeeds(
            formData.emergencyNeeds ?? undefined,
            farmId
          );

          window.location.reload();
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

  async function processGates(
    farmDetails: FarmDetailsData | undefined,
    farmId: string
  ) {
    for (const id of farmDetails?.deletedGateIds ?? []) {
      const response = await fetch(`/api/gates?gateId=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete gate data');
      }
    }

    const validGates = farmDetails?.gates?.filter(
      (gate) => gate.latitude && gate.longitude
    );
    for (const gate of validGates ?? []) {
      if (!gate.id) {
        const gateResponse = await fetch(`/api/gates`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: gate.name,
            latitude: gate.latitude,
            longitude: gate.longitude,
            farmId: farmId,
          }),
        });

        if (!gateResponse.ok) {
          throw new Error('Failed to submit crop data');
        }
      } else {
        const gateResponse = await fetch(`/api/gates?gateId=${gate.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: gate.name,
            latitude: gate.latitude,
            longitude: gate.longitude,
          }),
        });

        if (!gateResponse.ok) {
          throw new Error('Failed to submit crop data');
        }
      }
    }
  }

  async function processCrops(crops: CropsData | undefined, farmId: string) {
    if (crops?.noCrops) {
      for (const crop of crops?.crops ?? []) {
        if (crop.id) {
          const cropResponse = await fetch(`/api/crops?cropId=${crop.id}`, {
            method: 'DELETE',
          });

          if (!cropResponse.ok) {
            throw new Error('Failed to delete crop data');
          }
        }
      }
    } else {
      for (const id of crops?.deletedCropIds ?? []) {
        const cropResponse = await fetch(`/api/crops?cropId=${id}`, {
          method: 'DELETE',
        });

        if (!cropResponse.ok) {
          throw new Error('Failed to delete crop data');
        }
      }

      for (const crop of crops?.crops ?? []) {
        if (!crop.id) {
          const cropResponse = await fetch('/api/crops', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              farmId: farmId,
              name: crop.cropName,
              acreage: crop.acreage,
            }),
          });

          if (!cropResponse.ok) {
            throw new Error('Failed to submit crop data');
          }
        } else {
          const cropResponse = await fetch(`/api/crops?cropId=${crop.id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: crop.cropName,
              acreage: crop.acreage,
            }),
          });

          if (!cropResponse.ok) {
            throw new Error('Failed to update crop data');
          }
        }
      }
    }
  }

  async function processLivestock(
    livestock: LivestockData | undefined,
    farmId: string
  ) {
    if (livestock?.noLivestock) {
      for (const animal of livestock?.livestock ?? []) {
        if (animal.id) {
          const response = await fetch(
            `/api/livestocks?livestockId=${animal.id}`,
            {
              method: 'DELETE',
            }
          );

          if (!response.ok) {
            throw new Error('Failed to delete crop data');
          }
        }
      }
    } else {
      for (const id of livestock?.deletedLivestockIds ?? []) {
        const response = await fetch(`/api/livestocks?livestockId=${id}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('Failed to delete livestock data');
        }
      }

      for (const animal of livestock?.livestock ?? []) {
        if (!animal.id) {
          const livestockResponse = await fetch('/api/livestocks', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              farmId: farmId,
              name: animal.animalType,
              count: animal.count,
            }),
          });

          if (!livestockResponse.ok) {
            throw new Error('Failed to submit livestock data');
          }
        } else {
          const livestockResponse = await fetch(
            `/api/livestocks?livestockId=${animal.id}`,
            {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                name: animal.animalType,
                count: animal.count,
              }),
            }
          );

          if (!livestockResponse.ok) {
            throw new Error('Failed to update livestock data');
          }
        }
      }
    }
  }

  async function processEquipment(
    equipment: EquipmentData | undefined,
    farmId: string
  ) {
    if (equipment?.noEquipment) {
      for (const equip of equipment?.equipment ?? []) {
        if (equip.id) {
          const response = await fetch(
            `/api/equipments?equipmentId=${equip.id}`,
            {
              method: 'DELETE',
            }
          );

          if (!response.ok) {
            throw new Error('Failed to delete crop data');
          }
        }
      }
    } else {
      for (const id of equipment?.deletedEquipmentIds ?? []) {
        const response = await fetch(`/api/equipments?equipmentId=${id}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('Failed to delete equipment data');
        }
      }

      for (const equip of equipment?.equipment ?? []) {
        if (!equip.id) {
          const equipmentResponse = await fetch('/api/equipments', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              farmId: farmId,
              type: equip.equipmentType,
              description: equip.description,
            }),
          });

          if (!equipmentResponse.ok) {
            throw new Error('Failed to submit equipment data');
          }
        } else {
          const equipmentResponse = await fetch(
            `/api/equipments?equipmentId=${equip.id}`,
            {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                type: equip.equipmentType,
                description: equip.description,
              }),
            }
          );

          if (!equipmentResponse.ok) {
            throw new Error('Failed to update equipment data');
          }
        }
      }
    }
  }

  async function processEmergencyNeeds(
    emergencyNeeds: EmergencyNeedsData | undefined,
    farmId: string
  ) {
    if (emergencyNeeds?.noNeeds) {
      for (const need of emergencyNeeds?.emergencyNeeds ?? []) {
        if (need.id) {
          const response = await fetch(
            `/api/emergencyNeeds?needId=${need.id}`,
            {
              method: 'DELETE',
            }
          );

          if (!response.ok) {
            throw new Error('Failed to delete crop data');
          }
        }
      }
    } else {
      for (const id of emergencyNeeds?.deletedNeedIds ?? []) {
        const response = await fetch(`/api/emergencyNeeds?needId=${id}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('Failed to delete emergency need data');
        }
      }

      for (const need of emergencyNeeds?.emergencyNeeds ?? []) {
        if (!need.id) {
          const emergencyNeedsResponse = await fetch('/api/emergencyNeeds', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              farmId: farmId,
              type: need.equipmentType,
              details: need.details,
            }),
          });

          if (!emergencyNeedsResponse.ok) {
            throw new Error('Failed to submit equipment data');
          }
        } else {
          const emergencyNeedsResponse = await fetch(
            `/api/emergencyNeeds?needId=${need.id}`,
            {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                type: need.equipmentType,
                details: need.details,
              }),
            }
          );

          if (!emergencyNeedsResponse.ok) {
            throw new Error('Failed to update equipment data');
          }
        }
      }
    }
  }

  return (
    <div className='container mx-auto max-w-5xl py-4 md:py-10'>
      <div className='flex flex-col-reverse justify-between md:flex-row'>
        <div className='my-auto flex flex-row justify-around px-4'>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant='outline' className='pr-2'>
                {selectedFarm}
                <ChevronDown className='pt-0.5 text-black dark:text-white' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {/* Check if the farms are loaded */}
              {formStates.farms && formStates.farms.length > 0 ? (
                <>
                  {formStates.farms.map((farm, index) => (
                    <DropdownMenuItem
                      key={index}
                      onClick={() => handleFarmChange(index)}
                    >
                      {farm['farm-details']?.data?.farmName ||
                        `Farm ${index + 1}`}
                    </DropdownMenuItem>
                  ))}

                  {/* Add Farm Option at the End */}
                  <DropdownMenuItem
                    onClick={handleAddFarm}
                    className='font-bold text-green-600'
                  >
                    + Add Farm
                  </DropdownMenuItem>
                </>
              ) : (
                // Fallback in case no farms are available
                <DropdownMenuItem disabled>No farms available</DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            onClick={handleDeleteFarm}
            variant='destructive'
            className='ml-8'
          >
            Delete Farm
          </Button>
        </div>

        {showUnsavedChangesWarning && (
          <ConfirmationDialogue
            header='Are you sure you want to switch farms?'
            message='Only updating one farm at a time is supported. There are unsaved changes to the current farm that may be lost if you proceed.'
            confirmText='Switch'
            onConfirm={handleConfirmSwitch}
            onCancel={handleCancelSwitch}
          />
        )}
        {showDeleteFarmWarning && (
          <ConfirmationDialogue
            header={`Are you sure you want to delete ${selectedFarm}?`}
            message='The farm and all associated data will be permanently deleted.'
            confirmText='Delete'
            onConfirm={handleConfirmDelete}
            onCancel={handleCancelDelete}
          />
        )}

        <div className='mb-6 space-y-4 text-center md:mb-8 md:text-right'>
          <h1 className='text-3xl font-bold'>Settings</h1>
          <p className='hidden text-muted-foreground md:block'>
            Modify your profile, property details, or add additional farms.
          </p>
        </div>
      </div>

      {alertInfo.show && (
        <Alert
          variant={alertInfo.variant}
          className='relative mx-auto mb-4 mt-4 w-[85%] md:mb-6 md:mt-0 md:w-full'
        >
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

      {formStates.farms[selectedFarmIndex]?.['farm-details']?.data ||
      addingFarm ? (
        <Tabs
          value={activeTab.id}
          onValueChange={handleTabChange}
          className='w-full'
        >
          {/* Desktop tabs */}
          <TabsList className='hidden w-full grid-cols-6 md:grid'>
            {tabs.map((tab) => {
              let showError = false;
              let showCheck = false;

              // Only show indicators if the form has been submitted
              if (formSubmitted) {
                if (tab.id === 'profile') {
                  const profileState = formStates.profile;

                  if (!profileState || !profileState.isValid) {
                    showCheck = false;
                    showError = true;
                  } else {
                    showCheck = true;
                    showError = false;
                  }
                } else {
                  const farmIndex = selectedFarmIndex ?? 0; // Ensure we have a valid index (default 0)
                  const farmState =
                    formStates.farms[farmIndex]?.[
                      tab.id as keyof (typeof formStates.farms)[0]
                    ];

                  if (!farmState) {
                    showCheck = false;
                    showError = true;
                  } else {
                    // Use type narrowing to safely access properties
                    if (
                      tab.id === 'crops' &&
                      farmState.data &&
                      'noCrops' in farmState.data
                    ) {
                      showCheck =
                        farmState.data.noCrops === true || farmState.isValid;
                      showError = !showCheck;
                    } else if (
                      tab.id === 'livestock' &&
                      farmState.data &&
                      'noLivestock' in farmState.data
                    ) {
                      showCheck =
                        farmState.data.noLivestock === true ||
                        farmState.isValid;
                      showError = !showCheck;
                    } else if (
                      tab.id === 'equipment' &&
                      farmState.data &&
                      'noEquipment' in farmState.data
                    ) {
                      showCheck =
                        farmState.data.noEquipment === true ||
                        farmState.isValid;
                      showError = !showCheck;
                    } else if (
                      tab.id === 'emergencyNeeds' &&
                      farmState.data &&
                      'noNeeds' in farmState.data
                    ) {
                      showCheck =
                        farmState.data.noNeeds === true || farmState.isValid;
                      showError = !showCheck;
                    } else {
                      // For required sections, they're valid if the form is valid
                      showCheck = farmState.isValid;
                      showError = !farmState.isValid;
                    }
                  }
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
            <TabsContent value='profile'>
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

            <TabsContent value='farm-details' key={selectedFarmIndex}>
              <FarmDetailsForm
                onStateChange={(state) =>
                  updateFormState('farm-details', state, selectedFarmIndex)
                }
                initialData={
                  formStates.farms[selectedFarmIndex]?.['farm-details']?.data
                }
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
              key={`crops-${selectedFarmIndex}`}
              forceMount
              className='hidden data-[state=active]:block'
            >
              <CropsForm
                ref={cropsRef}
                onStateChange={(state) =>
                  updateFormState('crops', state, selectedFarmIndex)
                }
                initialData={formStates.farms[selectedFarmIndex]?.crops.data}
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
              key={`livestock-${selectedFarmIndex}`}
              forceMount
              className='hidden data-[state=active]:block'
            >
              <LivestockForm
                ref={livestockRef}
                onStateChange={(state) =>
                  updateFormState('livestock', state, selectedFarmIndex)
                }
                initialData={
                  formStates.farms[selectedFarmIndex]?.livestock.data
                }
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
              key={`equipment-${selectedFarmIndex}`}
              forceMount
              className='hidden data-[state=active]:block'
            >
              <EquipmentForm
                ref={equipmentRef}
                onStateChange={(state) =>
                  updateFormState('equipment', state, selectedFarmIndex)
                }
                initialData={
                  formStates.farms[selectedFarmIndex]?.equipment.data
                }
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
              key={`emergencyNeeds-${selectedFarmIndex}`}
              forceMount
              className='hidden data-[state=active]:block'
            >
              <EmergencyNeedsForm
                ref={emergencyNeedsRef}
                onStateChange={(state) =>
                  updateFormState('emergencyNeeds', state, selectedFarmIndex)
                }
                initialData={
                  formStates.farms[selectedFarmIndex]?.emergencyNeeds.data
                }
              />
              <div className='mt-6 flex justify-between'>
                <Button variant='outline' onClick={handlePreviousTab}>
                  Previous
                </Button>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      ) : (
        <div className='py-10 text-center'>Loading farm data...</div>
      )}

      <div className='mt-8 flex justify-center'>
        <Button
          size='lg'
          className='w-[80%] bg-gray-900 px-8 font-bold text-white hover:bg-gray-800 focus:ring-2 focus:ring-gray-600 md:w-full'
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Validating...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
