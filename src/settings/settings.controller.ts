import { Controller, Get, Put, Body } from '@nestjs/common';
import { SettingsService } from './settings.service';

@Controller('api/settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('persona')
  async getPersona() {
    const persona = await this.settingsService.getPersona();
    return { persona };
  }

  @Put('persona')
  async updatePersona(@Body('persona') persona: string) {
    const updated = await this.settingsService.updatePersona(persona);
    return { success: true, persona: updated.persona };
  }
}
