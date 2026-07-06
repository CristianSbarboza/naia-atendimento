import { Module } from '@nestjs/common';
import { RegisterService } from './register.service';
import { RegisterController } from './register.controller';
import { TenantsModule } from '../tenants/tenants.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [TenantsModule, UsersModule],
  controllers: [RegisterController],
  providers: [RegisterService],
})
export class RegisterModule {}
