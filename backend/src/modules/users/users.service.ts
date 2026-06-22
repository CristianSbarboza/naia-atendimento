import { Inject, Injectable } from '@nestjs/common';
import { User, users } from '../../database/schema/users';
import { DB, DrizzleDB } from '../../database/database.module';
import { eq } from 'drizzle-orm';
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
}
