import { PrismaClient, PlatformRole, MembershipRole, PaymentMode, PaymentStatus } from '@prisma/client';
import { hashPassword } from '../src/common/security/password';

const prisma = new PrismaClient();

async function main() {
  const old = await prisma.tenant.findUnique({ where: { slug: 'vs-residency-demo' } });
  if (old) {
    console.log('Demo tenant already exists; seed skipped to preserve local pilot data.');
    console.log('Use `npm run db:reset` from the repository root if you intentionally want a clean demo database.');
    return;
  }

  const tenant = await prisma.tenant.create({ data: { name: 'VS Residency', slug: 'vs-residency-demo' } });
  const community = await prisma.community.create({ data: { tenantId: tenant.id, name: 'VS Residency', code: 'VSRES', address: 'Demo Apartment Community', city: 'Hyderabad', state: 'Telangana' } });

  const buildings = [];
  for (const [i, code] of ['A','B','C'].entries()) {
    buildings.push(await prisma.building.create({ data: { tenantId: tenant.id, communityId: community.id, name: `Block ${code}`, code, sortOrder: i + 1 } }));
  }

  const units = [];
  for (const b of buildings) {
    for (let n = 101; n <= 110; n++) {
      units.push(await prisma.unit.create({ data: { tenantId: tenant.id, communityId: community.id, buildingId: b.id, unitNumber: String(n), floor: '1' } }));
    }
  }
  const a209 = await prisma.unit.create({ data: { tenantId: tenant.id, communityId: community.id, buildingId: buildings[0].id, unitNumber: '209', floor: '2' } });
  units.push(a209);

  const [adminHash, treasurerHash, residentHash] = await Promise.all([hashPassword('Admin@123'), hashPassword('Treasurer@123'), hashPassword('Resident@123')]);
  const admin = await prisma.user.create({ data: { tenantId: tenant.id, firstName: 'Community', lastName: 'Admin', mobile: '9000000001', passwordHash: adminHash, mustChangePassword: false, status: 'ACTIVE' } });
  const treasurer = await prisma.user.create({ data: { tenantId: tenant.id, firstName: 'Treasurer', mobile: '9000000002', passwordHash: treasurerHash, mustChangePassword: false, status: 'ACTIVE' } });
  const resident = await prisma.user.create({ data: { tenantId: tenant.id, firstName: 'Kiran', lastName: 'Resident', mobile: '9000000209', passwordHash: residentHash, mustChangePassword: false, status: 'ACTIVE' } });

  await prisma.userCommunityRole.createMany({ data: [
    { tenantId: tenant.id, communityId: community.id, userId: admin.id, role: PlatformRole.COMMUNITY_ADMIN },
    { tenantId: tenant.id, communityId: community.id, userId: treasurer.id, role: PlatformRole.TREASURER },
    { tenantId: tenant.id, communityId: community.id, userId: resident.id, role: PlatformRole.RESIDENT },
  ]});
  await prisma.unitMembership.create({ data: { tenantId: tenant.id, communityId: community.id, unitId: a209.id, userId: resident.id, role: MembershipRole.PRIMARY_RESIDENT, isPrimary: true } });

  // Add demo residents to the first few flats so admin screens look realistic.
  for (let i = 0; i < 8; i++) {
    const user = await prisma.user.create({ data: { tenantId: tenant.id, firstName: `Resident ${i + 1}`, mobile: `91111111${String(i + 10).slice(-2)}`, passwordHash: residentHash, mustChangePassword: false, status: 'ACTIVE' } });
    await prisma.userCommunityRole.create({ data: { tenantId: tenant.id, communityId: community.id, userId: user.id, role: PlatformRole.RESIDENT } });
    await prisma.unitMembership.create({ data: { tenantId: tenant.id, communityId: community.id, unitId: units[i].id, userId: user.id, role: MembershipRole.PRIMARY_RESIDENT, isPrimary: true } });
  }

  const eventType = await prisma.eventType.create({ data: { tenantId: tenant.id, communityId: community.id, code: 'FESTIVAL', name: 'Festival', description: 'Community festival or celebration' } });
  await prisma.eventType.createMany({ data: [
    { tenantId: tenant.id, communityId: community.id, code: 'SPORTS', name: 'Sports Event' },
    { tenantId: tenant.id, communityId: community.id, code: 'MEETING', name: 'Community Meeting' },
  ]});
  const expenseCats = await Promise.all([
    ['DECOR','Decoration'], ['FOOD','Food & Prasadam'], ['PRIEST','Priest / Pooja'], ['SOUND','Sound & Lighting']
  ].map(([code,name]) => prisma.expenseCategory.create({ data: { tenantId: tenant.id, communityId: community.id, code, name } })));

  const event = await prisma.event.create({ data: {
    tenantId: tenant.id, communityId: community.id, eventTypeId: eventType.id,
    name: 'Ganesh Festival 2026', slug: 'ganesh-festival-2026', description: 'VS Residency Ganesh Festival celebration and family Pooja registration.',
    startDate: new Date('2026-09-14T00:00:00+05:30'), endDate: new Date('2026-09-20T23:59:59+05:30'),
    status: 'PUBLISHED', registrationOpenAt: new Date('2026-09-05T00:00:00+05:30'), registrationCloseAt: new Date('2026-09-13T23:59:59+05:30')
  }});
  const sessions = [];
  for (let d = 14; d <= 20; d++) {
    sessions.push(await prisma.eventSession.create({ data: { tenantId: tenant.id, communityId: community.id, eventId: event.id, name: 'Daily Pooja', sessionDate: new Date(`2026-09-${d}T08:00:00+05:30`), startTime: '08:00', endTime: '10:00', capacity: 5, allowWaitlist: true } }));
  }

  const campaign = await prisma.contributionCampaign.create({ data: { tenantId: tenant.id, communityId: community.id, eventId: event.id, name: 'Ganesh Festival Contribution', amountPerUnit: 2000, startsAt: new Date('2026-09-05T00:00:00+05:30'), endsAt: new Date('2026-09-20T23:59:59+05:30') } });
  await prisma.contribution.createMany({ data: units.map(u => ({ tenantId: tenant.id, communityId: community.id, campaignId: campaign.id, unitId: u.id, expectedAmount: 2000 })) });

  const demoUsers = await prisma.user.findMany({ where: { tenantId: tenant.id, firstName: { startsWith: 'Resident ' } }, include: { memberships: true } });
  for (let i = 0; i < Math.min(3, demoUsers.length); i++) {
    const u = demoUsers[i]; const membership = u.memberships[0];
    await prisma.eventBooking.create({ data: { tenantId: tenant.id, communityId: community.id, eventId: event.id, sessionId: sessions[0].id, unitId: membership.unitId, userId: u.id, adults: 2, children: i % 2 } });
  }
  for (let i = 3; i < Math.min(7, demoUsers.length); i++) {
    const u = demoUsers[i]; const membership = u.memberships[0];
    await prisma.eventBooking.create({ data: { tenantId: tenant.id, communityId: community.id, eventId: event.id, sessionId: sessions[1].id, unitId: membership.unitId, userId: u.id, adults: 2 } });
  }

  for (let i = 0; i < 4; i++) {
    const con = await prisma.contribution.findUniqueOrThrow({ where: { campaignId_unitId: { campaignId: campaign.id, unitId: units[i].id } } });
    await prisma.payment.create({ data: { tenantId: tenant.id, communityId: community.id, contributionId: con.id, amount: 2000, mode: PaymentMode.UPI, status: PaymentStatus.VERIFIED, transactionRef: `DEMO-UPI-${1000+i}`, paidAt: new Date(), verifiedAt: new Date(), verifiedBy: treasurer.id } });
    await prisma.contribution.update({ where: { id: con.id }, data: { paidAmount: 2000, status: 'PAID' } });
  }
  const pendingUser = demoUsers[4];
  const pendingMembership = pendingUser.memberships[0];
  const pendingCon = await prisma.contribution.findUniqueOrThrow({ where: { campaignId_unitId: { campaignId: campaign.id, unitId: pendingMembership.unitId } } });
  await prisma.payment.create({ data: { tenantId: tenant.id, communityId: community.id, contributionId: pendingCon.id, userId: pendingUser.id, amount: 2000, mode: PaymentMode.UPI, status: PaymentStatus.MANUAL_PENDING, transactionRef: 'DEMO-PENDING-105', paidAt: new Date() } });

  await prisma.expense.createMany({ data: [
    { tenantId: tenant.id, communityId: community.id, eventId: event.id, categoryId: expenseCats[0].id, description: 'Stage decoration advance', vendorName: 'Demo Decorators', amount: 12000, expenseDate: new Date('2026-09-05') },
    { tenantId: tenant.id, communityId: community.id, eventId: event.id, categoryId: expenseCats[1].id, description: 'Prasadam advance', vendorName: 'Demo Caterers', amount: 8000, expenseDate: new Date('2026-09-05') },
  ]});
  await prisma.announcement.create({ data: { tenantId: tenant.id, communityId: community.id, eventId: event.id, title: 'Ganesh Festival registrations are open', message: 'Please choose your Pooja date. Maximum 5 families per day. Contribution is ₹2,000 per family.', isImportant: true, publishedAt: new Date() } });

  console.log('\nSeed complete.');
  console.log('Community: VSRES');
  console.log('Admin:      9000000001 / Admin@123');
  console.log('Treasurer:  9000000002 / Treasurer@123');
  console.log('Resident:   9000000209 / Resident@123 (A-209)\n');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
