import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { SettingsService } from '../settings/settings.service';
import { SkillRegistryService } from '../skills/skill-registry.service';
import { SkillContext, UserRole, ChannelType } from '../skills/interfaces/skill.interface';

export interface AiResponse {
  text: string;
  file?: {
    buffer: Buffer;
    filename: string;
  };
}

const MAX_TOOL_LOOPS = 5;

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly ai: GoogleGenAI;

  constructor(
    private readonly configService: ConfigService,
    private readonly settingsService: SettingsService,
    private readonly registry: SkillRegistryService,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    this.ai = new GoogleGenAI({ apiKey });
  }

  async processMessage(
    userMessage: string,
    pushName: string,
    history: any[] = [],
    customContext?: Partial<SkillContext>,
  ): Promise<AiResponse> {
    try {
      const context: SkillContext = {
        userId: customContext?.userId || pushName || 'whatsapp_user',
        userRole: customContext?.userRole || UserRole.PUBLIC_CLIENT,
        channel: customContext?.channel || ChannelType.WHATSAPP_CLIENT,
        phoneNumber: customContext?.phoneNumber,
        department: customContext?.department,
        metadata: { pushName, ...customContext?.metadata },
      };

      let generatedFile: { buffer: Buffer; filename: string } | null = null;

      // 1. Dynamic System Instructions from Base Persona + Active Skills
      const basePersona = await this.settingsService.getPersona();
      const skillPromptSnippets = this.registry.getSystemPromptSnippets(context);

      const systemInstruction = `
${basePersona}

### ACTIVE SKILL INSTRUCTIONS
${skillPromptSnippets}
      `.trim();

      // 2. Resolve Active Gemini Declarations for this user context
      const declarations = this.registry.getToolDeclarations(context);

      // Format history turns cleanly for Gemini SDK
      const formattedHistory = Array.isArray(history)
        ? history.map((h) => ({
            role: h.role === 'user' ? 'user' : 'model',
            parts: Array.isArray(h.parts) ? h.parts : [{ text: String(h.text || h.content || '') }],
          }))
        : [];

      const chat = this.ai.chats.create({
        model: 'gemini-2.5-flash',
        history: formattedHistory,
        config: {
          systemInstruction,
          temperature: 0.2,
          tools: declarations.length > 0 ? [{ functionDeclarations: declarations }] : [],
        },
      });

      let response = await chat.sendMessage({ message: userMessage });

      // 3. Autonomous Function Execution Loop with Circuit Breaker
      let loopCount = 0;
      while (response.functionCalls && response.functionCalls.length > 0 && loopCount < MAX_TOOL_LOOPS) {
        loopCount++;
        const calls = response.functionCalls;
        const toolResponses = [];

        for (const call of calls) {
          if (!call.name) continue;
          this.logger.log(`[Loop ${loopCount}] Invoking tool [${call.name}] for user [${pushName}]`);
          let result: any;

          try {
            const args = call.args ? (call.args as Record<string, any>) : {};
            result = await this.registry.executeTool(call.name, args, context);

            // Capture generated files (PDF, DOCX, XLSX, PPTX, MD)
            if (result?.fileBuffer) {
              generatedFile = {
                buffer: Buffer.from(result.fileBuffer, 'base64'),
                filename: result.filename,
              };
              delete result.fileBuffer; // Omit binary buffer from LLM conversation turns
            }
          } catch (e: any) {
            this.logger.error(`Tool execution error [${call.name}]: ${e.message}`, e.stack);
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
