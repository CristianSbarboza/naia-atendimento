import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { TenantScopeGuard } from '../auth/guards/tenant-scope.guard';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Roles('tenant_admin', 'super_admin')
@UseGuards(TenantScopeGuard)
@Controller('tenants/:tenantId/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Param('tenantId') tenantId: string, @Body() dto: CreateUserDto) {
    return this.usersService.create({ ...dto, tenantId });
  }

  @Get()
  findAll(@Param('tenantId') tenantId: string) {
    return this.usersService.findAllByTenant(tenantId);
  }

  @Get(':userId')
  async findOne(@Param('userId') userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return user;
  }

  @Patch(':userId')
  update(
    @Param('tenantId') tenantId: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(userId, tenantId, dto);
  }

  @Delete(':userId')
  @HttpCode(204)
  remove(@Param('tenantId') tenantId: string, @Param('userId') userId: string) {
    return this.usersService.remove(userId, tenantId);
  }
}

