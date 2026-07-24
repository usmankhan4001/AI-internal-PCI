import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { AiModule } from '../ai/ai.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AiModule, PrismaModule, AuthModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
