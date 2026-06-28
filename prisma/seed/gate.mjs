import { PrismaAdapter } from '@auth/prisma-adapter';
import { createId } from '@paralleldrive/cuid2';

const GATE =
{
    name: 'C4G Gate',
    latitude: 32.7555,
    longitude: -97.3308,
};

const createGate = async (
    prisma,
    adapter,
    { name, latitude, longitude, farmid }
) => {
    let gid = createId();
    const hasGate = await prisma.gate.findFirst({
        where: { name },
    });
    if (hasGate) {
        console.warn(`${name} already exists and will not be seeded!`);
        return;
    }

    await prisma.gate.create({
        data: {
            id: gid,
            name: name,
            latitude: latitude,
            longitude: longitude,
            farm: {connect: {id: farmid}}
        }
    });
    console.log(`${name} has been seeded`);
    return gid;
}

export const seedGate = async (prisma) => {
    const adapter = PrismaAdapter(prisma);
    let fid = (await prisma.farm.findFirst({
        where: { name: `C4G Farm` }
    })).id;
    await createGate(prisma, adapter,
        {
            name: GATE.name,
            latitude: GATE.latitude,
            longitude: GATE.longitude,
            farmid: fid
        }
    );
  };

