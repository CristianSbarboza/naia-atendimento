import { Global, Module } from '@nestjs/common';
import { createPool } from 'mysql2/promise';
import { drizzle, MySql2Database } from 'drizzle-orm/mysql2';
import * as schema from './schema';
import { env } from '../config/env';

export type DrizzleDB = MySql2Database<typeof schema>;
export const DB = Symbol('DRIZZLE_DB');

@Global()
@Module({
  providers: [
    {
      provide: DB,
      useFactory: () => {
        const pool = createPool(env.DATABASE_URL);
        return drizzle(pool, { schema, mode: 'default' });
      },
    },
  ],
  exports: [DB],
})
export class DatabaseModule {}
