import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { KnowledgeModule } from './knowledge/knowledge.module';
import { BitrixModule } from './bitrix/bitrix.module';
import { AiModule } from './ai/ai.module';
import { SessionModule } from './session/session.module';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { PdfModule } from './pdf/pdf.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule, 
    KnowledgeModule, BitrixModule, AiModule, SessionModule, WhatsappModule, PdfModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
