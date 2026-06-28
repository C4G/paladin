import { PrismaClient } from '@prisma/client';
import { seedUsers } from './seed/users.mjs';
import { seedFarm } from './seed/farm.mjs';
import { seedGate } from './seed/gate.mjs';
import { seedOrganizations } from './seed/organizations.mjs';
import { seedResponses } from './seed/responses.mjs';

const prisma = new PrismaClient();

async function main() {
  // Initial seeds
  console.log('----- Starting to seed initial data -----');
  await seedUsers(prisma);
  await seedFarm(prisma);
  await seedGate(prisma);
  await seedOrganizations(prisma);
  await seedResponses(prisma);
  console.log('----- Finished seeding initial data -----');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
