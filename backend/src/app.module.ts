import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';
import { WebhookModule } from './modules/webhook/webhook.module';
import { PdfModule } from './modules/pdf/pdf.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { RegisterModule } from './modules/register/register.module';
import { ChannelsModule } from './modules/channels/channels.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';

@Module({
  imports: [
    DatabaseModule,
    RedisModule,
    PdfModule,
    WebhookModule,
    UsersModule,
    AuthModule,
    TenantsModule,
    RegisterModule,
    ChannelsModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }],
})
export class AppModule {}
