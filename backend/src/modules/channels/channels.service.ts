import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DB, DrizzleDB } from '../../database/database.module';
import { Channel, ChannelConfig, channels } from '../../database/schema/channels';

export interface CreateChannelInput {
  type: string;
  name: string;
  instanceName?: string;
  systemPrompt?: string;
  config?: ChannelConfig;
}

export interface UpdateChannelInput {
  name?: string;
  instanceName?: string;
  systemPrompt?: string;
  config?: ChannelConfig;
  status?: string;
}

@Injectable()
export class ChannelsService {
  constructor(@Inject(DB) private readonly db: DrizzleDB) {}

  async create(tenantId: string, input: CreateChannelInput): Promise<Channel> {
    const [created] = await this.db
      .insert(channels)
      .values({ tenantId, ...input })
      .returning();
    return created;
  }

  async findAllByTenant(tenantId: string): Promise<Channel[]> {
    return this.db
      .select()
      .from(channels)
      .where(eq(channels.tenantId, tenantId));
  }

  async findById(id: string, tenantId: string): Promise<Channel | null> {
    const [channel] = await this.db
      .select()
      .from(channels)
      .where(and(eq(channels.id, id), eq(channels.tenantId, tenantId)))
      .limit(1);
    return channel ?? null;
  }

  async findByInstanceName(instanceName: string): Promise<Channel | null> {
    const [channel] = await this.db
      .select()
      .from(channels)
      .where(eq(channels.instanceName, instanceName))
      .limit(1);
    return channel ?? null;
  }

  async update(id: string, tenantId: string, input: UpdateChannelInput): Promise<Channel | null> {
    const [updated] = await this.db
      .update(channels)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(channels.id, id), eq(channels.tenantId, tenantId)))
      .returning();
    return updated ?? null;
  }

  async deactivate(id: string, tenantId: string): Promise<Channel | null> {
    return this.update(id, tenantId, { status: 'inactive' });
  }
}
