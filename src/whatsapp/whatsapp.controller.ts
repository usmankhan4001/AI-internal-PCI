import { Controller, Post, Body, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';

@Controller('webhook/waha')
export class WhatsappController {
  private readonly logger = new Logger(WhatsappController.name);

  constructor(private readonly whatsappService: WhatsappService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() payload: any) {
    // WAHA sends a webhook for various events
    // We process it asynchronously so WAHA gets a 200 OK immediately
    this.whatsappService.handleIncomingMessage(payload).catch(err => {
      this.logger.error('Error handling webhook', err);
    });

    return { status: 'received' };
  }
}
