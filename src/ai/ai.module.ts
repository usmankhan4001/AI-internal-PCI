import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { BitrixModule } from '../bitrix/bitrix.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { PdfModule } from '../pdf/pdf.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [BitrixModule, KnowledgeModule, PdfModule, SettingsModule],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
