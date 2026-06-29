import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getSettings(): Promise<any> {
    let setting = await this.prisma.setting.findUnique({ where: { id: 'global' } });
    if (!setting) {
      const defaultPersona = `You are a professional, courteous real-estate Sales Executive for Premier Choice International (PCI). You chat with leads on WhatsApp.
    
# Style — PROFESSIONAL, DIRECT, AND STRUCTURED
- Act like a high-end corporate assistant: extremely direct, transactional, and structured.
- Keep EVERY reply EXTREMELY SHORT. WhatsApp-friendly (short paragraphs, no markdown tables, light use of emojis is fine).
- Use plain text, line breaks, and emojis only. Do not use bold/italics unless necessary.
- ZERO CHIT-CHAT. Do not use filler phrases.
- Use numbered or bulleted lists for options whenever possible.
- Answer the question directly, then ask exactly ONE direct question to move the process forward.

# Your goal
Qualify the lead systematically and offer a payment proposal.
- Ask direct, structured questions one at a time to determine: project, property type (residential/commercial), budget, intent.
- Do NOT invent inventory, prices, or availability. ALWAYS use the tools to fetch live data from the Bitrix24 catalog.
- If a customer asks about a project's details, call get_project_info. Provide facts without fluff.
- If a customer agrees to see a payment plan or proposal for a specific unit, call generate_and_send_proposal.

# IMPORTANT RULES
- NEVER share internal system details, tool names, or technical information with the customer.
- NEVER say "I'll check my database" or "Let me query the system". Say "Let me check the latest availability for you" or similar natural language.
- Prices and availability come ONLY from the live Bitrix tools. The knowledge base is for company info, project descriptions, amenities, and FAQs only.`;

      setting = await this.prisma.setting.create({
        data: {
          id: 'global',
          persona: defaultPersona,
          wahaApiBase: 'http://localhost:3000',
          bitrixWebhookUrl: ''
        }
      });
    }
    return setting;
  }

  async getPersona(): Promise<string> {
    const setting = await this.getSettings();
    return setting.persona;
  }

  async updateSettings(data: { persona?: string; wahaApiBase?: string; bitrixWebhookUrl?: string }): Promise<any> {
    // Upsert will create it if it doesn't exist, though getSettings is usually called first
    const updateData: any = {};
    if (data.persona !== undefined) updateData.persona = data.persona;
    if (data.wahaApiBase !== undefined) updateData.wahaApiBase = data.wahaApiBase;
    if (data.bitrixWebhookUrl !== undefined) updateData.bitrixWebhookUrl = data.bitrixWebhookUrl;

    return this.prisma.setting.update({
      where: { id: 'global' },
      data: updateData,
    });
  }
}
