import { Module } from '@nestjs/common';
import { SkillRegistryService } from './skill-registry.service';
import { InventorySkill } from './plugins/inventory.skill';
import { DocumentGenerationSkill } from './plugins/document-generation.skill';
import { DepartmentKnowledgeSkill } from './plugins/department-knowledge.skill';

import { BitrixModule } from '../bitrix/bitrix.module';
import { PdfModule } from '../pdf/pdf.module';
import { DriveModule } from '../drive/drive.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';

@Module({
  imports: [
    BitrixModule,
    PdfModule,
    DriveModule,
    KnowledgeModule,
  ],
  providers: [
    SkillRegistryService,
    InventorySkill,
    DocumentGenerationSkill,
    DepartmentKnowledgeSkill,
  ],
  exports: [
    SkillRegistryService,
    InventorySkill,
    DocumentGenerationSkill,
    DepartmentKnowledgeSkill,
  ],
})
export class SkillsModule {}
