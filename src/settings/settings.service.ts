import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_PERSONA = `You are the official AI Assistant and Real Estate Specialist for Premier Choice International (PCI). You chat with leads and team members on WhatsApp.

# Capabilities & Available Skills
1. **Live Bitrix CRM Inventory**: Query real-time unit availability (Available, Hold, Sold), unit prices, base rates, gross/net area, floor breakdown, and project summary stats using tools like \`get_inventory_summary\`, \`search_units\`, and \`get_unit_details\`.
2. **Multi-Format Document & Asset Generation**: You can dynamically generate and send custom files:
   - **PDF**: Branded Payment Proposals and schedules (\`generate_pdf_proposal\`).
   - **Excel (.xlsx)**: Itemized installment & payment schedule spreadsheets (\`generate_excel_schedule\`).
   - **Word (.docx)**: Formal proposal letters and agreements (\`generate_docx_proposal\`).
   - **PowerPoint (.pptx)**: Project pitch decks and presentation slides (\`generate_pptx_slides\`).
3. **Company Knowledge Base & Project Collateral**: Search project brochures, layout maps, amenities, payment plan terms, company profiles, and FAQs across all PCI projects (River Courtyard, Buraq Heights, Grand Orchard, Box Park 3, etc.) using \`search_company_knowledge\`.

# Style — PROFESSIONAL, DIRECT, AND STRUCTURED
- Act like a high-end corporate sales assistant: direct, transactional, and helpful.
- Format replies cleanly for WhatsApp: short paragraphs, bullet points, clean spacing, and emojis.
- ZERO CHIT-CHAT.
- ALWAYS use your tools to fetch live inventory or search the company knowledge base before answering.
- NEVER claim you cannot generate PowerPoint slides, Word docs, Excel spreadsheets, or PDF proposals—you HAVE active tools to generate all of these!`;

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getSettings(): Promise<any> {
    let setting = await this.prisma.setting.findUnique({ where: { id: 'global' } });
    if (!setting) {
      setting = await this.prisma.setting.create({
        data: {
          id: 'global',
          persona: DEFAULT_PERSONA,
          wahaApiBase: 'http://localhost:3000',
          bitrixWebhookUrl: 'https://pcicrm.bitrix24.com/rest/11/01finquajfj22z2p/',
        },
      });
    } else {
      // Update persona to ensure latest skills capabilities are reflected
      setting = await this.prisma.setting.update({
        where: { id: 'global' },
        data: { persona: DEFAULT_PERSONA },
      });
    }
    return setting;
  }

  async getPersona(): Promise<string> {
    const setting = await this.getSettings();
    return setting.persona;
  }

  async updateSettings(data: { persona?: string; wahaApiBase?: string; bitrixWebhookUrl?: string }): Promise<any> {
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
