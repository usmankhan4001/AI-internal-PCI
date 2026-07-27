import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiService } from '../ai/ai.service';
import { SessionService } from '../session/session.service';

const getMimeType = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf':
      return 'application/pdf';
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'doc':
      return 'application/msword';
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'xls':
      return 'application/vnd.ms-excel';
    case 'pptx':
      return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    case 'md':
      return 'text/markdown';
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'webp':
      return 'image/webp';
    case 'csv':
      return 'text/csv';
    case 'txt':
      return 'text/plain';
    case 'ogg':
      return 'audio/ogg';
    case 'mp3':
      return 'audio/mpeg';
    case 'm4a':
      return 'audio/mp4';
    case 'mp4':
      return 'video/mp4';
    default:
      return 'application/octet-stream';
  }
};

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly wahaUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly aiService: AiService,
    private readonly sessionService: SessionService,
  ) {
    this.wahaUrl = this.configService.get<string>('WAHA_API_BASE') || 'http://localhost:3000';
  }

  async handleIncomingMessage(payload: any) {
    if (payload?.event !== 'message' || payload?.payload?.fromMe) {
      return;
    }

    const message = payload.payload;
    const rawFrom = message.from || '';

    // 1. Ignore group chats (@g.us)
    if (rawFrom.endsWith('@g.us')) {
      return;
    }

    // 2. Clean phone number extraction
    const phone = rawFrom.replace(/@.*$/, '');
    const pushName = message.pushName || 'Valued Client';
    
    // 3. Extract text content or construct prompt for media attachments
    let text = message.body || '';
    
    if (!text && message.hasMedia) {
      const mediaType = message.type || 'media attachment';
      const caption = message.caption ? ` Caption: "${message.caption}"` : '';
      text = `[User sent a WhatsApp ${mediaType}.${caption}] Please acknowledge receipt and offer relevant project assistance.`;
    }

    if (!text || text.trim().length === 0) {
      return;
    }

    this.logger.log(`Received message from ${phone} (${pushName}): ${text.slice(0, 80)}`);

    const { user, session } = await this.sessionService.getOrCreateSession(phone, pushName);
    await this.sessionService.addMessage(session.id, 'user', text);

    const formattedHistory = session.messages.map((m) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));

    try {
      const { text: responseText, file } = await this.aiService.processMessage(
        text,
        pushName,
        formattedHistory,
        { phoneNumber: phone },
      );

      await this.sessionService.addMessage(session.id, 'assistant', responseText);

      if (file) {
        await this.sendWahaFile(rawFrom, file.buffer, file.filename, responseText);
      } else {
        await this.sendWahaMessage(rawFrom, responseText);
      }
    } catch (e: any) {
      this.logger.error(`Error processing message from ${phone}: ${e.message}`, e.stack);
      await this.sendWahaMessage(
        rawFrom,
        'Apologies, I am experiencing temporary technical difficulties. Please try again in a moment.',
      );
    }
  }

  private async sendWahaMessage(chatId: string, text: string) {
    try {
      const response = await fetch(`${this.wahaUrl}/api/sendText`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
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
    } catch (e: any) {
      this.logger.error(`Failed to send WAHA message to ${chatId}: ${e.message}`);
    }
  }

  private async sendWahaFile(
    chatId: string,
    fileBuffer: Buffer,
    filename: string,
    caption: string,
  ) {
    try {
      const mimetype = getMimeType(filename);
      const base64Data = fileBuffer.toString('base64');
      const dataUri = `data:${mimetype};base64,${base64Data}`;

      const response = await fetch(`${this.wahaUrl}/api/sendFile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          chatId,
          file: { mimetype, filename, data: dataUri },
          caption,
          session: 'default',
        }),
      });

      if (!response.ok) {
        throw new Error(`WAHA returned ${response.status}: ${await response.text()}`);
      }
      this.logger.log(`Successfully sent ${filename} (${mimetype}) to ${chatId}`);
    } catch (e: any) {
      this.logger.error(`Failed to send WAHA file to ${chatId}: ${e.message}`);
    }
  }
}
