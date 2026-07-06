import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { TenantScopeGuard } from '../auth/guards/tenant-scope.guard';
import { ChannelsService, CreateChannelInput, UpdateChannelInput } from './channels.service';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';

@Roles('tenant_admin', 'super_admin')
@UseGuards(TenantScopeGuard)
@Controller('tenants/:tenantId/channels')
export class ChannelsController {
  constructor(private readonly channelsService: ChannelsService) {}

  @Post()
  create(@Param('tenantId') tenantId: string, @Body() dto: CreateChannelDto) {
    return this.channelsService.create(tenantId, dto as CreateChannelInput);
  }

  @Get()
  findAll(@Param('tenantId') tenantId: string) {
    return this.channelsService.findAllByTenant(tenantId);
  }

  @Get(':channelId')
  async findOne(
    @Param('tenantId') tenantId: string,
    @Param('channelId') channelId: string,
  ) {
    const channel = await this.channelsService.findById(channelId, tenantId);
    if (!channel) throw new NotFoundException('Channel não encontrado');
    return channel;
  }

  @Patch(':channelId')
  async update(
    @Param('tenantId') tenantId: string,
    @Param('channelId') channelId: string,
    @Body() dto: UpdateChannelDto,
  ) {
    const channel = await this.channelsService.update(channelId, tenantId, dto as UpdateChannelInput);
    if (!channel) throw new NotFoundException('Channel não encontrado');
    return channel;
  }

  @Delete(':channelId')
  async deactivate(
    @Param('tenantId') tenantId: string,
    @Param('channelId') channelId: string,
  ) {
    const channel = await this.channelsService.deactivate(channelId, tenantId);
    if (!channel) throw new NotFoundException('Channel não encontrado');
    return channel;
  }
}
