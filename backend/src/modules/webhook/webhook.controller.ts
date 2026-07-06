import { Controller, Get, HttpCode, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { WebhookService } from './webhook.service';
import { Public } from '../auth/decorators/public.decorator';

@Public()
@Controller()
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post('webhook')
  @HttpCode(200)
  handleWebhook(@Req() req: Request): { status: string } {
    this.webhookService.handleWebhook(req.body).catch((err) =>
      console.error('❌ Unhandled webhook error:', err),
    );
    return { status: 'received' };
  }

  @Get('health')
  healthCheck(): { status: string } {
    return { status: 'ok' };
  }
}
