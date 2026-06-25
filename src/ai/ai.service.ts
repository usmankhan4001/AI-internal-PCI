import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI, Type, Schema } from '@google/genai';
import { BitrixService } from '../bitrix/bitrix.service';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { PdfService } from '../pdf/pdf.service';

export interface AiResponse {
  text: string;
  file?: {
    buffer: Buffer;
    filename: string;
  };
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly ai: GoogleGenAI;

  constructor(
    private configService: ConfigService,
    private bitrixService: BitrixService,
    private knowledgeService: KnowledgeService,
    private pdfService: PdfService,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    this.ai = new GoogleGenAI({ apiKey });
  }

  private getSystemPrompt(): string {
    return `You are a professional, courteous real-estate Sales Executive for Premier Choice International (PCI). You chat with leads on WhatsApp.
    
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
  }

  async processMessage(userMessage: string, pushName: string, history: any[] = []): Promise<AiResponse> {
    try {
      let generatedFile = null;

      const chat = this.ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
          systemInstruction: this.getSystemPrompt(),
          temperature: 0.2,
          tools: [
            {
              functionDeclarations: [
                {
                  name: 'list_projects',
                  description: 'List all Premier Choice International projects that have inventory. Use to know which projects exist before searching units.',
                },
                {
                  name: 'search_units',
                  description: 'Search LIVE available units. Filter by project name (or id), property type (e.g. RESIDENTIAL, COMMERCIAL), and/or floor. Returns matching available units.',
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      project: { type: Type.STRING, description: 'Project name or id (optional).' },
                      type: { type: Type.STRING, description: 'Property type name or id, e.g. RESIDENTIAL or COMMERCIAL (optional).' },
                      floor: { type: Type.STRING, description: 'Floor name or id (optional).' },
                    },
                  } as Schema,
                },
                {
                  name: 'get_unit_details',
                  description: 'Get full details for one unit by its id (from search_units): project, type, category, floor, area, base rate, and total price.',
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      unitId: { type: Type.STRING, description: 'The unit product id.' },
                    },
                    required: ['unitId'],
                  } as Schema,
                },
                {
                  name: 'get_project_info',
                  description: 'Answer detailed questions about a project (amenities, specs, layout, location, payment terms, FAQs) using the company knowledge base.',
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      question: { type: Type.STRING, description: 'The customer question.' },
                    },
                    required: ['question'],
                  } as Schema,
                },
                {
                  name: 'generate_and_send_proposal',
                  description: 'Generates a branded PDF Payment Plan Proposal for a specific unit and sends it to the customer.',
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      unitId: { type: Type.STRING, description: 'The unit product id.' },
                    },
                    required: ['unitId'],
                  } as Schema,
                }
              ],
            },
          ],
        },
      });

      let response = await chat.sendMessage({ message: userMessage });

      while (response.functionCalls && response.functionCalls.length > 0) {
        const calls = response.functionCalls;
        const toolResponses = [];

        for (const call of calls) {
          this.logger.log(`Executing tool: ${call.name} with args: ${JSON.stringify(call.args)}`);
          let result: any;

          try {
            switch (call.name) {
              case 'list_projects':
                const projects = await this.bitrixService.listProjects();
                result = { projects: projects.map((p) => ({ id: p.id, name: p.value })) };
                break;

              case 'search_units': {
                const argsSearch = call.args || {};
                const filter = {
                  projectId: await this.bitrixService.resolveProjectId(String(argsSearch.project ?? '')) ?? undefined,
                  type: argsSearch.type as string | undefined,
                  floor: argsSearch.floor as string | undefined,
                };
                const units = await this.bitrixService.searchCached(filter);
                const top = units.slice(0, 8);
                result = { count: units.length, showing: top.length, units: top.map(u => ({ id: u.id, name: u.name, project: u.projectName, price: u.totalPrice })) };
                break;
              }

              case 'get_unit_details': {
                const argsUnit = call.args || {};
                const unit = await this.bitrixService.getNormalizedUnit(String(argsUnit.unitId));
                result = unit ? unit : { error: 'Unit not found' };
                break;
              }

              case 'get_project_info': {
                const argsInfo = call.args || {};
                const knowledge = await this.knowledgeService.search(String(argsInfo.question));
                if (knowledge.length === 0) {
                  result = { info: 'No information found in the knowledge base.' };
                } else {
                  result = { info: knowledge.map(k => `[${k.category} - ${k.topic}] ${k.content}`).join('\n') };
                }
                break;
              }

              case 'generate_and_send_proposal': {
                const argsProp = call.args || {};
                const unit = await this.bitrixService.getNormalizedUnit(String(argsProp.unitId));
                if (!unit) {
                  result = { error: 'Unit not found, cannot generate proposal.' };
                } else {
                  // Generate PDF
                  const pdfBuffer = await this.pdfService.generatePaymentPlan(pushName, unit);
                  generatedFile = {
                    buffer: pdfBuffer,
                    filename: `PCI_Payment_Plan_${unit.name}.pdf`
                  };
                  result = { success: true, message: 'PDF generated and ready to send. Tell the customer you have sent it.' };
                }
                break;
              }

              default:
                result = { error: `Unknown tool: ${call.name}` };
            }
          } catch (e: any) {
            this.logger.error(`Tool execution failed: ${call.name}`, e.stack);
            result = { error: e.message };
          }

          toolResponses.push({
            functionResponse: {
              name: call.name,
              response: result,
            },
          });
        }

        response = await chat.sendMessage({ message: toolResponses as any });
      }

      return {
        text: response.text || '',
        file: generatedFile || undefined,
      };
    } catch (error: any) {
      this.logger.error(`Error in processMessage: ${error.message}`, error.stack);
      throw error;
    }
  }
}
