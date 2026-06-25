import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiService } from '../ai/ai.service';
import { SessionService } from '../session/session.service';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly wahaUrl: string;

  constructor(
    private configService: ConfigService,
    private aiService: AiService,
    private sessionService: SessionService,
  ) {
    this.wahaUrl = this.configService.get<string>('WAHA_API_BASE') || 'http://localhost:3000';
  }

  async handleIncomingMessage(payload: any) {
    if (payload?.event !== 'message' || payload?.payload?.fromMe) {
      return;
    }

    const message = payload.payload;
    const phone = message.from.replace('@c.us', '');
    const text = message.body;
    const pushName = message.pushName || 'User';

    if (!text) return;

    this.logger.log(`Received message from ${phone}: ${text}`);

    const { user, session } = await this.sessionService.getOrCreateSession(phone, pushName);
    await this.sessionService.addMessage(session.id, 'user', text);

    const formattedHistory = session.messages.map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));

    try {
      const { text: responseText, file } = await this.aiService.processMessage(text, pushName, formattedHistory);

      await this.sessionService.addMessage(session.id, 'assistant', responseText);

      if (file) {
        await this.sendWahaFile(message.from, file.buffer, file.filename, responseText);
      } else {
        await this.sendWahaMessage(message.from, responseText);
      }
    } catch (e) {
      this.logger.error(`Error processing message from ${phone}`, e);
      await this.sendWahaMessage(message.from, 'Sorry, I am facing some technical issues. Please try again later.');
    }
  }

  private async sendWahaMessage(chatId: string, text: string) {
    try {
      const response = await fetch(`${this.wahaUrl}/api/sendText`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          chatId,
          text,
          session: 'default',
        }),
      });

      if (!response.ok) {
        throw new Error(`WAHA returned ${response.status}: ${await response.text()}`);
      }
      this.logger.log(`Successfully sent reply to ${chatId}`);
    } catch (e) {
      this.logger.error(`Failed to send WAHA message to ${chatId}`, e);
    }
  }

  private async sendWahaFile(chatId: string, fileBuffer: Buffer, filename: string, caption: string) {
    try {
      const base64Data = fileBuffer.toString('base64');
      const dataUri = `data:application/pdf;base64,${base64Data}`;

      const response = await fetch(`${this.wahaUrl}/api/sendFile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          chatId,
          file: { mimetype: 'application/pdf', filename, data: dataUri },
          caption,
          session: 'default',
        }),
      });

      if (!response.ok) {
        throw new Error(`WAHA returned ${response.status}: ${await response.text()}`);
      }
      this.logger.log(`Successfully sent file to ${chatId}`);
    } catch (e) {
      this.logger.error(`Failed to send WAHA file to ${chatId}`, e);
    }
  }
}
