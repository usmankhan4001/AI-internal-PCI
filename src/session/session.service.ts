import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves an active session for a given phone number.
   * If none exists (or the user doesn't exist), creates them.
   */
  async getOrCreateSession(phone: string, pushName: string = 'User') {
    let user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          phone,
          name: pushName,
          role: 'LEAD',
          language: 'english',
          profile: {},
        },
      });
      this.logger.log(`Created new user for phone ${phone}`);
    }

    let session = await this.prisma.session.findFirst({
      where: { userId: user.id, active: true },
      include: { messages: true },
    });

    if (!session) {
      session = await this.prisma.session.create({
        data: {
          userId: user.id,
          active: true,
          metadata: {},
        },
        include: { messages: true },
      });
      this.logger.log(`Created new active session for user ${user.id}`);
    }

    return { user, session };
  }

  /**
   * Adds a message to the session's history.
   */
  async addMessage(sessionId: string, role: 'user' | 'assistant', content: string) {
    return this.prisma.message.create({
      data: {
        sessionId,
        role,
        content,
      },
    });
  }

  /**
   * Updates the user's language preference.
   */
  async updateLanguage(userId: string, language: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { language },
    });
  }

  /**
   * Updates the user's lead profile (merging with existing profile JSON).
   */
  async updateProfile(userId: string, newProfileData: any) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;

    const currentProfile = user.profile ? (typeof user.profile === 'string' ? JSON.parse(user.profile) : user.profile) : {};
    const updatedProfile = { ...currentProfile, ...newProfileData };

    return this.prisma.user.update({
      where: { id: userId },
      data: { profile: updatedProfile },
    });
  }
}
