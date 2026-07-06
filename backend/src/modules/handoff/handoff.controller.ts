import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { TenantScopeGuard } from '../auth/guards/tenant-scope.guard';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { HandoffService } from './handoff.service';

@Roles('operator', 'tenant_admin', 'super_admin')
@UseGuards(TenantScopeGuard)
@Controller('tenants/:tenantId/conversations')
export class HandoffController {
  constructor(private readonly handoffService: HandoffService) {}

  @Get()
  listConversations(
    @Param('tenantId') tenantId: string,
    @Query('status') status?: string,
  ) {
    return this.handoffService.listByTenant(tenantId, status);
  }

  @Get(':conversationId')
  async getConversation(
    @Param('tenantId') tenantId: string,
    @Param('conversationId') conversationId: string,
  ) {
    const conv = await this.handoffService.findById(conversationId, tenantId);
    if (!conv) throw new NotFoundException('Conversa não encontrada');
    return conv;
  }

  @Patch(':conversationId/takeover')
  takeOver(
    @Param('tenantId') tenantId: string,
    @Param('conversationId') conversationId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.handoffService.takeOver(conversationId, user.sub, tenantId);
  }

  @Patch(':conversationId/return-to-bot')
  returnToBot(
    @Param('tenantId') tenantId: string,
    @Param('conversationId') conversationId: string,
  ) {
    return this.handoffService.returnToBot(conversationId, tenantId);
  }
}
