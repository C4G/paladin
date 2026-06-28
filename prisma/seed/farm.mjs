import { PrismaAdapter } from '@auth/prisma-adapter';
import { createId } from '@paralleldrive/cuid2';

const FARMS =
[{
    latitude: 32.7555,
    longitude: -97.3308,
    name: 'C4G Farm',
    streetAddress: '1234 Farm Road',
    city: "Atlanta",
    state: "GA",
    zipcode: '12345',
    otherInfo: 'other info'
},
{
    latitude: 33.7554,
    longitude: -96.3308,
    name: 'C4G Farm2',
    streetAddress: '1234 Farm Road',
    city: "Atlanta",
    state: "GA",
    zipcode: '12345',
    otherInfo: 'other info'
}]


const createFarm = async (
    prisma,
    adapter,
    { latitude, longitude, name, streetAddress, city, state, zipcode, otherInfo, userid }
) => {
    let fid = createId();
    const hasFarm = await prisma.farm.findFirst({
        where: { name },
    });
    if (hasFarm) {
        console.warn(`${name} already exists and will not be seeded!`);
        return;
    }
    await prisma.farm.create({
        data: {
            id: fid,
            latitude: latitude,
            longitude: longitude,
            name: name,
            streetAddress: streetAddress,
            city: city,
            state: state,
            zipcode: zipcode,
            otherInfo: otherInfo,
            user : {connect: {id: userid}}
        }
    });
    console.log(`${name} has been seeded`);
    return fid;
}

export const seedFarm = async (prisma) => {
    const adapter = PrismaAdapter(prisma);
    let uid = (await prisma.user.findFirst({
        where: { name: 'C4G Staff' }
    })).id;
    for (const FARM of FARMS) {
        await createFarm(prisma, adapter, 
            {
                latitude: FARM.latitude,
                longitude: FARM.longitude,
                name: FARM.name,
                streetAddress: FARM.streetAddress,
                city: FARM.city,
                state: FARM.state,
                zipcode: FARM.zipcode,
                otherInfo: FARM.otherInfo,
                userid: uid
            }
        );
  };
}