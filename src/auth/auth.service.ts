import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly jwtSecret: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.jwtSecret = this.configService.get<string>('JWT_SECRET') || 'pci-ai-platform-secret-key-2026';
  }

  async register(email: string, password: string, name: string, department: string = 'general') {
    const existing = await this.prisma.adminUser.findUnique({ where: { email } });
    if (existing) {
      throw new Error('User with this email already exists');
    }

    // First user is auto-admin
    const userCount = await this.prisma.adminUser.count();
    const role = userCount === 0 ? 'admin' : 'member';

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await this.prisma.adminUser.create({
      data: {
        email,
        passwordHash,
        name,
        department,
        role,
      },
    });

    this.logger.log(`User registered: ${email} (${role})`);

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      department: user.department,
      role: user.role,
      token: this.generateToken(user),
    };
  }

  async login(email: string, password: string) {
    const user = await this.prisma.adminUser.findUnique({ where: { email } });
    if (!user) {
      throw new Error('Invalid email or password');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new Error('Invalid email or password');
    }

    this.logger.log(`User logged in: ${email}`);

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      department: user.department,
      role: user.role,
      token: this.generateToken(user),
    };
  }

  async validateToken(token: string): Promise<any> {
    try {
      const payload = jwt.verify(token, this.jwtSecret) as any;
      const user = await this.prisma.adminUser.findUnique({ where: { id: payload.sub } });
      if (!user) throw new Error('User not found');
      return { id: user.id, email: user.email, name: user.name, department: user.department, role: user.role };
    } catch {
      throw new Error('Invalid token');
    }
  }

  async getAllUsers() {
    return this.prisma.adminUser.findMany({
      select: { id: true, email: true, name: true, department: true, role: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  private generateToken(user: any): string {
    return jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      this.jwtSecret,
      { expiresIn: '7d' },
    );
  }
}
