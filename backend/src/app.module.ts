import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';
import { WebhookModule } from './modules/webhook/webhook.module';
import { PdfModule } from './modules/pdf/pdf.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [DatabaseModule, RedisModule, PdfModule, WebhookModule, UsersModule, AuthModule],
})
export class AppModule {}
