import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { BitrixModule } from '../bitrix/bitrix.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { PdfModule } from '../pdf/pdf.module';

@Module({
  imports: [BitrixModule, KnowledgeModule, PdfModule],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
