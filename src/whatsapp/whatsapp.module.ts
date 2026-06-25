import { Module } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { WhatsappController } from './whatsapp.controller';
import { AiModule } from '../ai/ai.module';
import { SessionModule } from '../session/session.module';

@Module({
  imports: [AiModule, SessionModule],
  providers: [WhatsappService],
  controllers: [WhatsappController]
})
export class WhatsappModule {}
