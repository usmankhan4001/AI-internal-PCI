import { Controller, Get, Put, Body } from '@nestjs/common';
import { SettingsService } from './settings.service';

@Controller('api/settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  async getSettings() {
    const settings = await this.settingsService.getSettings();
    return { data: settings };
  }

  @Get('persona')
  async getPersona() {
    const persona = await this.settingsService.getPersona();
    return { persona };
  }

  @Put()
  async updateSettings(@Body() body: any) {
    const updated = await this.settingsService.updateSettings(body);
    return { success: true, data: updated };
  }
}
