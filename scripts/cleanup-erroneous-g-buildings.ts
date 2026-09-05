import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { slug: 'vs-residency-demo' } });
  const community = await prisma.community.findFirstOrThrow({ where: { tenantId: tenant.id, code: 'VSRES' } });
  const buildings = await prisma.building.findMany({ where: { tenantId: tenant.id, communityId: community.id, code: { in: ['G1','G2','G3','G4','G5','G6'] }, name: { startsWith: 'Block A - G' } }, select: { id: true } });
  const units = await prisma.unit.findMany({ where: { buildingId: { in: buildings.map(x => x.id) } }, select: { id: true } });
  await prisma.$transaction([
    prisma.contribution.deleteMany({ where: { unitId: { in: units.map(x => x.id) } } }),
    prisma.unit.deleteMany({ where: { id: { in: units.map(x => x.id) } } }),
    prisma.building.deleteMany({ where: { id: { in: buildings.map(x => x.id) } } }),
  ]);
  console.log(`Removed ${buildings.length} mistaken building records and ${units.length} units.`);
}
main().catch(error => { console.error(error); process.exit(1); }).finally(() => prisma.$disconnect());
