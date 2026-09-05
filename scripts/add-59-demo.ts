import { PrismaClient, PlatformRole, MembershipRole, UserStatus } from '@prisma/client';
import { hashPassword } from '../community-events-backend/src/common/security/password';

const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { slug: 'vs-residency-demo' } });
  const community = await prisma.community.findFirstOrThrow({ where: { tenantId: tenant.id, code: 'VSRES' } });
  const building = await prisma.building.findFirstOrThrow({ where: { tenantId: tenant.id, communityId: community.id, code: 'A' } });
  const flatNumbers = ['G1','G2','G3','G4','G5','G6','G7','G8','G9', ...Array.from({ length: 50 }, (_, i) => String((Math.floor(i / 10) + 1) * 100 + (i % 10) + 1))];
  const passwordHash = await hashPassword('vasu@123');
  const campaign = await prisma.contributionCampaign.findFirst({ where: { tenantId: tenant.id, communityId: community.id }, orderBy: { createdAt: 'desc' } });
  for (const [index, unitNumber] of flatNumbers.entries()) {
    const numeric = Number(unitNumber);
    const unit = await prisma.unit.upsert({
      where: { buildingId_unitNumber: { buildingId: building.id, unitNumber } },
      update: { isActive: true, floor: Number.isFinite(numeric) ? String(Math.floor(numeric / 100)) : 'G' },
      create: { tenantId: tenant.id, communityId: community.id, buildingId: building.id, unitNumber, floor: Number.isFinite(numeric) ? String(Math.floor(numeric / 100)) : 'G', unitType: 'Apartment' },
    });
    const mobile = `9200000${String(index + 101).padStart(3, '0')}`;
    const user = await prisma.user.upsert({
      where: { tenantId_mobile: { tenantId: tenant.id, mobile } },
      update: { firstName: 'Demo', lastName: `Resident ${unitNumber}`, email: `demo.a.${unitNumber.toLowerCase()}@example.test`, passwordHash, mustChangePassword: false, status: UserStatus.ACTIVE },
      create: { tenantId: tenant.id, firstName: 'Demo', lastName: `Resident ${unitNumber}`, mobile, email: `demo.a.${unitNumber.toLowerCase()}@example.test`, passwordHash, mustChangePassword: false, status: UserStatus.ACTIVE },
    });
    const existingPrimary = await prisma.unitMembership.findFirst({ where: { unitId: unit.id, isPrimary: true, endsAt: null, NOT: { userId: user.id } } });
    const membershipRole = existingPrimary ? MembershipRole.FAMILY_MEMBER : MembershipRole.PRIMARY_RESIDENT;
    await prisma.userCommunityRole.upsert({ where: { communityId_userId_role: { communityId: community.id, userId: user.id, role: PlatformRole.RESIDENT } }, update: {}, create: { tenantId: tenant.id, communityId: community.id, userId: user.id, role: PlatformRole.RESIDENT } });
    await prisma.unitMembership.upsert({ where: { unitId_userId: { unitId: unit.id, userId: user.id } }, update: { role: membershipRole, isPrimary: membershipRole === MembershipRole.PRIMARY_RESIDENT, endsAt: null }, create: { tenantId: tenant.id, communityId: community.id, unitId: unit.id, userId: user.id, role: membershipRole, isPrimary: membershipRole === MembershipRole.PRIMARY_RESIDENT } });
    if (campaign) await prisma.contribution.upsert({ where: { campaignId_unitId: { campaignId: campaign.id, unitId: unit.id } }, update: {}, create: { tenantId: tenant.id, communityId: community.id, campaignId: campaign.id, unitId: unit.id, expectedAmount: campaign.amountPerUnit } });
  }
  console.log(`Added or refreshed ${flatNumbers.length} Block A flats/accounts.`);
  console.log(`Flats: ${flatNumbers.join(', ')}`);
  console.log('Mobile range: 9200000101 - 9200000159');
  console.log('Password: vasu@123');
}

main().catch(error => { console.error(error); process.exit(1); }).finally(() => prisma.$disconnect());
