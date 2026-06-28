import { createId } from '@paralleldrive/cuid2';

/**
 * Seed organizations, members, and requests for UI testing
 * 
 * Scenario:
 * - 3 organizations with different structures
 * - Multiple members per org with varying roles
 * - Requests on org farms for map visualization
 */

const ORGANIZATIONS = [
  {
    name: 'Georgia Farmers Cooperative',
    description: 'A cooperative of small farms across northern Georgia helping each other during disasters.',
  },
  {
    name: 'Southeast Farm Alliance',
    description: 'Regional alliance coordinating disaster response for farms in the Southeast.',
  },
  {
    name: 'Peach State Growers',
    description: 'Network of fruit and vegetable farms in central Georgia.',
  },
];

// Farms to create for each org (will be associated with the first user in the org)
const ORG_FARMS = [
  // Georgia Farmers Cooperative farms
  {
    orgIndex: 0,
    farms: [
      {
        name: 'Sunrise Valley Farm',
        latitude: 34.0522,
        longitude: -84.2311,
        streetAddress: '100 Valley Road',
        city: 'Dahlonega',
        state: 'GA',
        zipcode: '30533',
        totalAcreage: '150',
        yearEstablished: '1985',
        otherInfo: 'Cattle and hay production',
      },
      {
        name: 'Mountain View Homestead',
        latitude: 34.8755,
        longitude: -83.9585,
        streetAddress: '250 Mountain Ridge',
        city: 'Blairsville',
        state: 'GA',
        zipcode: '30512',
        totalAcreage: '80',
        yearEstablished: '1992',
        otherInfo: 'Mixed vegetables and livestock',
      },
    ],
  },
  // Southeast Farm Alliance farms
  {
    orgIndex: 1,
    farms: [
      {
        name: 'Riverbend Acres',
        latitude: 33.4510,
        longitude: -82.1245,
        streetAddress: '500 River Road',
        city: 'Augusta',
        state: 'GA',
        zipcode: '30901',
        totalAcreage: '320',
        yearEstablished: '1970',
        otherInfo: 'Cotton and soybeans',
      },
      {
        name: 'Coastal Plains Farm',
        latitude: 31.5785,
        longitude: -84.1558,
        streetAddress: '1200 Plains Highway',
        city: 'Albany',
        state: 'GA',
        zipcode: '31701',
        totalAcreage: '500',
        yearEstablished: '1965',
        otherInfo: 'Peanuts and pecans',
      },
    ],
  },
  // Peach State Growers farms
  {
    orgIndex: 2,
    farms: [
      {
        name: 'Peachtree Orchards',
        latitude: 32.8407,
        longitude: -83.6324,
        streetAddress: '800 Orchard Lane',
        city: 'Macon',
        state: 'GA',
        zipcode: '31201',
        totalAcreage: '200',
        yearEstablished: '1978',
        otherInfo: 'Peaches and blueberries',
      },
      {
        name: 'Sweet Georgia Farm',
        latitude: 33.0801,
        longitude: -83.2321,
        streetAddress: '350 Sweet Road',
        city: 'Milledgeville',
        state: 'GA',
        zipcode: '31061',
        totalAcreage: '175',
        yearEstablished: '1988',
        otherInfo: 'Vidalia onions and tomatoes',
      },
    ],
  },
];

// Requests to create on org farms
const REQUESTS = [
  {
    farmName: 'Sunrise Valley Farm',
    disasterType: 'Tornado',
    comments: 'Barn roof damaged, need help securing livestock and repairing fencing. Urgent assistance needed.',
  },
  {
    farmName: 'Riverbend Acres',
    disasterType: 'Flood',
    comments: 'River flooding damaged irrigation system. Need pumps and labor to clear debris.',
  },
  {
    farmName: 'Coastal Plains Farm',
    disasterType: 'Hurricane',
    comments: 'Hurricane damage to storage buildings. Lost power, need generators and tarps.',
  },
  {
    farmName: 'Peachtree Orchards',
    disasterType: 'Frost',
    comments: 'Late frost damaged 30% of peach crop. Need help with emergency harvesting of remaining fruit.',
  },
  {
    farmName: 'Mountain View Homestead',
    disasterType: 'Wildfire',
    comments: 'Fire came close to property. Need help with firebreaks and evacuation planning for livestock.',
  },
  {
    farmName: 'Sweet Georgia Farm',
    disasterType: 'Drought',
    comments: 'Extended drought affecting crop yields. Looking for water hauling assistance.',
  },
];

export async function seedOrganizations(prisma) {
  console.log('  Seeding organizations...');

  // Get existing users to assign as members
  const adminUser = await prisma.user.findFirst({
    where: { email: 'c4gdevad@gmail.com' },
  });
  const staffUser = await prisma.user.findFirst({
    where: { email: 'c4gdevstaff@gmail.com' },
  });

  if (!adminUser || !staffUser) {
    console.warn('  Required users not found. Run user seeds first.');
    return;
  }

  const createdOrgs = [];
  const createdFarms = [];

  // Create organizations
  for (const orgData of ORGANIZATIONS) {
    const existing = await prisma.organization.findFirst({
      where: { name: orgData.name },
    });

    if (existing) {
      console.warn(`  ${orgData.name} already exists, skipping...`);
      createdOrgs.push(existing);
      continue;
    }

    const org = await prisma.organization.create({
      data: {
        id: createId(),
        name: orgData.name,
        description: orgData.description,
      },
    });
    console.log(`  Created org: ${org.name}`);
    createdOrgs.push(org);
  }

  // Add members to organizations
  // Staff user is OWNER of first org, MEMBER of second
  // Admin can see all orgs anyway
  const membershipData = [
    { orgIndex: 0, userId: staffUser.id, role: 'OWNER' },
    { orgIndex: 1, userId: staffUser.id, role: 'MEMBER' },
    { orgIndex: 2, userId: staffUser.id, role: 'MANAGER' },
  ];

  for (const membership of membershipData) {
    const org = createdOrgs[membership.orgIndex];
    if (!org) continue;

    const existing = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: membership.userId,
          organizationId: org.id,
        },
      },
    });

    if (existing) {
      console.warn(`  Member already exists in ${org.name}, skipping...`);
      continue;
    }

    await prisma.organizationMember.create({
      data: {
        id: createId(),
        userId: membership.userId,
        organizationId: org.id,
        role: membership.role,
      },
    });
    console.log(`  Added ${membership.role} to ${org.name}`);
  }

  // Create farms for each organization
  for (const orgFarmSet of ORG_FARMS) {
    const org = createdOrgs[orgFarmSet.orgIndex];
    if (!org) continue;

    for (const farmData of orgFarmSet.farms) {
      const existing = await prisma.farm.findFirst({
        where: { name: farmData.name },
      });

      if (existing) {
        console.warn(`  Farm ${farmData.name} already exists, skipping...`);
        createdFarms.push(existing);
        continue;
      }

      const farm = await prisma.farm.create({
        data: {
          id: createId(),
          ...farmData,
          userId: staffUser.id, // owned by staff user
          organizationId: org.id,
        },
      });
      console.log(`  Created farm: ${farm.name} (${org.name})`);
      createdFarms.push(farm);
    }
  }

  // Create requests on farms
  console.log('  Seeding requests...');
  for (const requestData of REQUESTS) {
    const farm = createdFarms.find((f) => f.name === requestData.farmName);
    if (!farm) {
      console.warn(`  Farm ${requestData.farmName} not found, skipping request...`);
      continue;
    }

    const existing = await prisma.request.findFirst({
      where: {
        farmId: farm.id,
        disasterType: requestData.disasterType,
        closedOn: null,
      },
    });

    if (existing) {
      console.warn(`  Request on ${farm.name} already exists, skipping...`);
      continue;
    }

    await prisma.request.create({
      data: {
        id: createId(),
        farmId: farm.id,
        userId: staffUser.id,
        disasterType: requestData.disasterType,
        comments: requestData.comments,
      },
    });
    console.log(`  Created request: ${requestData.disasterType} at ${farm.name}`);
  }

  console.log('  Organizations seeding complete!');
}
