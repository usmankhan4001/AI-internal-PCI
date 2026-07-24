import { Controller, Post, Get, Delete, Body, Param, HttpException, HttpStatus, UseGuards, Req } from '@nestjs/common';
import { AiService } from '../ai/ai.service';
import { ChatService } from './chat.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('api/chat')
export class ChatController {
  constructor(
    private readonly aiService: AiService,
    private readonly chatService: ChatService,
  ) {}

  // Send a message (creates session if none provided)
  @Post()
  @UseGuards(AuthGuard)
  async handleChat(
    @Body() body: { message: string; sessionId?: string },
    @Req() req: any,
  ) {
    if (!body.message) {
      throw new HttpException('Message is required', HttpStatus.BAD_REQUEST);
    }

    try {
      const userId = req.user.id;
      const userName = req.user.name;

      // Get or create session
      let sessionId = body.sessionId;
      if (!sessionId) {
        const session = await this.chatService.createSession(userId);
        sessionId = session.id;
      }

      // Save user message
      await this.chatService.addMessage(sessionId, 'user', body.message);

      // Get session history for context
      const session = await this.chatService.getSessionMessages(sessionId, userId);
      const history = session.messages.map((m) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      }));

      // Process with AI
      const response = await this.aiService.processMessage(body.message, userName, history);

      // Save assistant response
      await this.chatService.addMessage(sessionId, 'assistant', response.text);

      let fileBase64 = null;
      let filename = null;
      if (response.file && response.file.buffer) {
        fileBase64 = response.file.buffer.toString('base64');
        filename = response.file.filename;
      }

      return {
        sessionId,
        text: response.text,
        file: fileBase64 ? { base64: fileBase64, filename } : null,
      };
    } catch (error: any) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // List user's chat sessions
  @Get('sessions')
  @UseGuards(AuthGuard)
  async getSessions(@Req() req: any) {
    const sessions = await this.chatService.getUserSessions(req.user.id);
    return { success: true, data: sessions };
  }

  // Get a specific session's messages
  @Get('sessions/:id')
  @UseGuards(AuthGuard)
  async getSession(@Param('id') id: string, @Req() req: any) {
    try {
      const session = await this.chatService.getSessionMessages(id, req.user.id);
      return { success: true, data: session };
    } catch {
      throw new HttpException('Session not found', HttpStatus.NOT_FOUND);
    }
  }

  // Delete a session
  @Delete('sessions/:id')
  @UseGuards(AuthGuard)
  async deleteSession(@Param('id') id: string, @Req() req: any) {
    try {
      await this.chatService.deleteSession(id, req.user.id);
      return { success: true };
    } catch {
      throw new HttpException('Session not found', HttpStatus.NOT_FOUND);
    }
  }
}
