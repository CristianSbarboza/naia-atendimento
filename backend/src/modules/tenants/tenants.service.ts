import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DB, DrizzleDB } from '../../database/database.module';
import { Tenant, tenants } from '../../database/schema/tenants';

export interface CreateTenantInput {
  name: string;
  slug: string;
}

export interface UpdateTenantInput {
  name?: string;
  slug?: string;
  status?: string;
}

@Injectable()
export class TenantsService {
  constructor(@Inject(DB) private readonly db: DrizzleDB) {}

  async create(input: CreateTenantInput): Promise<Tenant> {
    const [created] = await this.db
      .insert(tenants)
      .values({ name: input.name, slug: input.slug })
      .returning();
    return created;
  }

  async findAll(): Promise<Tenant[]> {
    return this.db.select().from(tenants);
  }

  async findById(id: string): Promise<Tenant | null> {
    const [tenant] = await this.db
      .select()
      .from(tenants)
      .where(eq(tenants.id, id))
      .limit(1);
    return tenant ?? null;
  }

  async update(id: string, input: UpdateTenantInput): Promise<Tenant | null> {
    const [updated] = await this.db
      .update(tenants)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(tenants.id, id))
      .returning();
    return updated ?? null;
  }

  async deactivate(id: string): Promise<Tenant | null> {
    return this.update(id, { status: 'inactive' });
  }
}
