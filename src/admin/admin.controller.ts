import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AuthGuard } from '../auth/auth.guard';

@UseGuards(AuthGuard)
@Controller('api/admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  async getUsers() {
    return this.adminService.getUsers();
  }

  @Post('users')
  async createUser(@Body() data: any) {
    return this.adminService.createUser(data);
  }

  @Delete('users/:id')
  async deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }

  @Get('analytics')
  async getAnalytics() {
    return this.adminService.getAnalytics();
  }
}
