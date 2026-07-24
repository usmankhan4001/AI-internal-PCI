import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  async createSession(userId: string, title?: string) {
    return this.prisma.teamChatSession.create({
      data: {
        userId,
        title: title || 'New Chat',
      },
      include: { messages: true },
    });
  }

  async getUserSessions(userId: string) {
    return this.prisma.teamChatSession.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { content: true, createdAt: true },
        },
      },
    });
  }

  async getSessionMessages(sessionId: string, userId: string) {
    const session = await this.prisma.teamChatSession.findFirst({
      where: { id: sessionId, userId },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!session) throw new Error('Session not found');
    return session;
  }

  async addMessage(sessionId: string, role: string, content: string) {
    const message = await this.prisma.teamChatMessage.create({
      data: { sessionId, role, content },
    });

    // Auto-title: use first user message as session title
    if (role === 'user') {
      const session = await this.prisma.teamChatSession.findUnique({ where: { id: sessionId } });
      if (session && (session.title === 'New Chat' || !session.title)) {
        await this.prisma.teamChatSession.update({
          where: { id: sessionId },
          data: { title: content.substring(0, 80) },
        });
      }
    }

    // Touch updatedAt
    await this.prisma.teamChatSession.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() },
    });

    return message;
  }

  async deleteSession(sessionId: string, userId: string) {
    const session = await this.prisma.teamChatSession.findFirst({
      where: { id: sessionId, userId },
    });
    if (!session) throw new Error('Session not found');

    await this.prisma.teamChatMessage.deleteMany({ where: { sessionId } });
    await this.prisma.teamChatSession.delete({ where: { id: sessionId } });
    return { success: true };
  }
}
