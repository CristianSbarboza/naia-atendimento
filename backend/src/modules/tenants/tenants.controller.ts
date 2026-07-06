import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@Roles('super_admin')
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post()
  create(@Body() dto: CreateTenantDto) {
    return this.tenantsService.create(dto);
  }

  @Get()
  findAll() {
    return this.tenantsService.findAll();
  }

  @Get(':tenantId')
  async findOne(@Param('tenantId') tenantId: string) {
    const tenant = await this.tenantsService.findById(tenantId);
    if (!tenant) throw new NotFoundException('Tenant não encontrado');
    return tenant;
  }

  @Patch(':tenantId')
  async update(@Param('tenantId') tenantId: string, @Body() dto: UpdateTenantDto) {
    const tenant = await this.tenantsService.update(tenantId, dto);
    if (!tenant) throw new NotFoundException('Tenant não encontrado');
    return tenant;
  }

  @Delete(':tenantId')
  async deactivate(@Param('tenantId') tenantId: string) {
    const tenant = await this.tenantsService.deactivate(tenantId);
    if (!tenant) throw new NotFoundException('Tenant não encontrado');
    return tenant;
  }
}
