import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService
  ) {}

  async getUsers() {
    const users = await this.prisma.adminUser.findMany();
    return users.map(user => {
      const { passwordHash, ...rest } = user;
      return rest;
    });
  }

  async createUser(data: any) {
    const { email, password, name, department, role } = data;
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.prisma.adminUser.create({
      data: {
        email,
        passwordHash,
        name,
        department,
        role
      }
    });
    const { passwordHash: _, ...rest } = user;
    return rest;
  }

  async deleteUser(id: string) {
    await this.prisma.adminUser.delete({
      where: { id }
    });
    return { success: true };
  }

  async getAnalytics() {
    const [totalInternalUsers, totalKnowledgeDocs, totalExternalLeads, totalWhatsappSessions] = await Promise.all([
      this.prisma.adminUser.count(),
      this.prisma.document.count(),
      this.prisma.user.count(),
      this.prisma.session.count()
    ]);
    return { totalInternalUsers, totalKnowledgeDocs, totalExternalLeads, totalWhatsappSessions };
  }
}
