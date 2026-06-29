import { Controller, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { AiService } from '../ai/ai.service';

@Controller('api/chat')
export class ChatController {
  constructor(private readonly aiService: AiService) {}

  @Post()
  async handleChat(@Body() body: { message: string, history?: any[] }) {
    if (!body.message) {
      throw new HttpException('Message is required', HttpStatus.BAD_REQUEST);
    }

    try {
      const response = await this.aiService.processMessage(body.message, 'Internal Admin Team', body.history || []);
      
      let fileBase64 = null;
      let filename = null;
      if (response.file && response.file.buffer) {
        fileBase64 = response.file.buffer.toString('base64');
        filename = response.file.filename;
      }

      return {
        text: response.text,
        file: fileBase64 ? { base64: fileBase64, filename } : null
      };
    } catch (error: any) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
