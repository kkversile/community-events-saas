import { PlatformRole } from '@prisma/client';

export interface RequestContext {
  userId: string;
  tenantId: string;
  communityId: string;
  roles: PlatformRole[];
  unitId?: string;
}
