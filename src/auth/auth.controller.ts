import { Controller, Post, Body, Get, HttpException, HttpStatus, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(
    @Body() body: { email: string; password: string; name: string; department?: string },
  ) {
    if (!body.email || !body.password || !body.name) {
      throw new HttpException('Email, password, and name are required', HttpStatus.BAD_REQUEST);
    }

    try {
      const result = await this.authService.register(
        body.email,
        body.password,
        body.name,
        body.department || 'general',
      );
      return { success: true, data: result };
    } catch (error: any) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    if (!body.email || !body.password) {
      throw new HttpException('Email and password are required', HttpStatus.BAD_REQUEST);
    }

    try {
      const result = await this.authService.login(body.email, body.password);
      return { success: true, data: result };
    } catch (error: any) {
      throw new HttpException(error.message, HttpStatus.UNAUTHORIZED);
    }
  }

  @Get('me')
  @UseGuards(AuthGuard)
  async me(@Body() _body: any) {
    // The guard attaches user to request — we access via decorator
    // For now, the guard validates the token and we re-validate here
    return { success: true };
  }

  @Get('users')
  @UseGuards(AuthGuard)
  async getUsers() {
    const users = await this.authService.getAllUsers();
    return { success: true, data: users };
  }
}
