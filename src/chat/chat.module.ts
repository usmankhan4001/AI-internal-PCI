import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [AiModule],
  controllers: [ChatController]
})
export class ChatModule {}
