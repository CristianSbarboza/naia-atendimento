import { Global, Module } from '@nestjs/common';
import Redis from 'ioredis';
import { env } from '../config/env';

export const REDIS = Symbol('REDIS');

@Global()
@Module({
  providers: [
    {
      provide: REDIS,
      useFactory: () => {
        const client = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 3 });
        client.on('connect', () => console.log('💾 Redis connected!'));
        client.on('error', (err: unknown) => console.error('❌ Redis error:', err));
        return client;
      },
    },
  ],
  exports: [REDIS],
})
export class RedisModule {}
