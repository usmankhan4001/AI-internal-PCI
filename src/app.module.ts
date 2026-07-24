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
import { SettingsModule } from './settings/settings.module';

import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { ChatModule } from './chat/chat.module';
import { AuthModule } from './auth/auth.module';
import { DriveModule } from './drive/drive.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'frontend', 'dist'),
      exclude: ['/api/{*splat}', '/webhook/{*splat}'],
    }),
    PrismaModule, 
    AuthModule,
    KnowledgeModule, BitrixModule, AiModule, SessionModule, WhatsappModule, PdfModule, SettingsModule, ChatModule,
    DriveModule, AdminModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
