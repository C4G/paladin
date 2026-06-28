import { createId } from '@paralleldrive/cuid2';

const RESPONDER_NAMES = [
  'Alice Johnson',
  'Bob Martinez',
  'Carol Chen',
  'David Okafor',
  'Emily Patel',
  'Frank Nguyen',
  'Grace Kim',
];

const EQUIPMENT_OPTIONS = [
  'Tractor, water pump, chainsaw',
  'Pickup truck with trailer, shovels, sandbags',
  'Fire extinguishers (x3), first aid kit',
  'Bulldozer, generator, flood lights',
  'ATV, rope, emergency blankets',
  'Water tanker, hose kit',
  'Flatbed truck, tarps, hand tools',
];

export const seedResponses = async (prisma) => {
  // Find the first open request
  const request = await prisma.request.findFirst({
    where: { closedOn: null },
    orderBy: { createdAt: 'desc' },
  });

  if (!request) {
    console.warn('No open requests found — skipping response seeding.');
    return;
  }

  // Check if responses already seeded
  const existingCount = await prisma.response.count({
    where: { RequestId: request.id },
  });
  if (existingCount >= 5) {
    console.warn(
      `Request "${request.id}" already has ${existingCount} responses — skipping.`
    );
    return;
  }

  // Create fake users and their responses
  for (let i = 0; i < RESPONDER_NAMES.length; i++) {
    const userId = createId();
    const email = `fake-responder-${i + 1}@test.local`;

    const existingUser = await prisma.user.findFirst({ where: { email } });
    let user;
    if (existingUser) {
      user = existingUser;
    } else {
      user = await prisma.user.create({
        data: {
          id: userId,
          name: RESPONDER_NAMES[i],
          email,
          emailVerified: new Date(),
        },
      });
    }

    // Stagger arrival times: 1–48 hours from now
    const hoursFromNow = 1 + i * 7;
    const eta = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);

    await prisma.response.create({
      data: {
        id: createId(),
        userId: user.id,
        RequestId: request.id,
        estimatedArrivalTime: eta,
        equipment: EQUIPMENT_OPTIONS[i],
      },
    });

    console.log(
      `Seeded response from ${RESPONDER_NAMES[i]} (ETA: ${hoursFromNow}h)`
    );
  }

  console.log(
    `Seeded ${RESPONDER_NAMES.length} responses on request ${request.id.slice(0, 8)}...`
  );
};
