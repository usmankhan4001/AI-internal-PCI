import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { SkillsModule } from '../skills/skills.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [SkillsModule, SettingsModule],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
