import { ConflictException, Injectable } from '@nestjs/common';
import { TenantsService } from '../tenants/tenants.service';
import { UsersService, SafeUser } from '../users/users.service';
import { Tenant } from '../../database/schema/tenants';

export interface RegisterInput {
  companyName: string;
  slug: string;
  adminEmail: string;
  adminPassword: string;
  adminName: string;
}

export interface RegisterResult {
  tenant: Tenant;
  user: SafeUser;
}

@Injectable()
export class RegisterService {
  constructor(
    private readonly tenantsService: TenantsService,
    private readonly usersService: UsersService,
  ) {}

  async register(input: RegisterInput): Promise<RegisterResult> {
    const existing = await this.tenantsService.findAll();
    const slugTaken = existing.some((t) => t.slug === input.slug);
    if (slugTaken) {
      throw new ConflictException(`Slug "${input.slug}" já está em uso`);
    }

    const tenant = await this.tenantsService.create({
      name: input.companyName,
      slug: input.slug,
    });

    const user = await this.usersService.create({
      tenantId: tenant.id,
      email: input.adminEmail,
      password: input.adminPassword,
      name: input.adminName,
      role: 'tenant_admin',
    });

    return { tenant, user };
  }
}
