import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { User, users } from '../../database/schema/users';
import { DB, DrizzleDB } from '../../database/database.module';
import { and, eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';

export type SafeUser = Omit<User, 'passwordHash'>;

export interface CreateUserInput {
  tenantId: string | null;
  name: string;
  email: string;
  password: string;
  role: string;
}

export interface UpdateUserInput {
  name?: string;
  role?: string;
}

@Injectable()
export class UsersService {
  constructor(@Inject(DB) private readonly db: DrizzleDB) {}

  async findByEmail(email: string): Promise<User | null> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return user || null;
  }

  async findById(id: string): Promise<SafeUser | null> {
    const [user] = await this.db
      .select({
        id: users.id,
        tenantId: users.tenantId,
        email: users.email,
        name: users.name,
        role: users.role,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return user ?? null;
  }

  async create(input: CreateUserInput): Promise<SafeUser> {
    const id = randomUUID();
    const passwordHash = await bcrypt.hash(input.password, 10);

    await this.db.insert(users).values({
      id,
      tenantId: input.tenantId,
      email: input.email,
      passwordHash,
      name: input.name,
      role: input.role,
    });

    const created = await this.findById(id);
    if (!created) throw new Error('Failed to create user');
    return created;
  }

  async findAllByTenant(tenantId: string): Promise<SafeUser[]> {
    return this.db
      .select({
        id: users.id,
        tenantId: users.tenantId,
        email: users.email,
        name: users.name,
        role: users.role,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.tenantId, tenantId));
  }

  async update(id: string, tenantId: string, input: UpdateUserInput): Promise<SafeUser> {
    const [updated] = await this.db
      .update(users)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(users.id, id), eq(users.tenantId, tenantId)))
      .returning({
        id: users.id,
        tenantId: users.tenantId,
        email: users.email,
        name: users.name,
        role: users.role,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      });

    if (!updated) throw new NotFoundException('Usuário não encontrado');
    return updated;
  }

  async remove(id: string, tenantId: string): Promise<void> {
    await this.db
      .delete(users)
      .where(and(eq(users.id, id), eq(users.tenantId, tenantId)));
  }
}
