import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { DriveService } from './drive.service';
import { AuthGuard } from '../auth/auth.guard';

@UseGuards(AuthGuard)
@Controller('api/drive')
export class DriveController {
  constructor(private readonly driveService: DriveService) {}

  @Get('folders')
  async listFolders() {
    return this.driveService.listFolders();
  }

  @Get('files/:folderId')
  async listFilesInFolder(@Param('folderId') folderId: string) {
    return this.driveService.listFilesInFolder(folderId);
  }

  @Post('sync')
  async syncFile(
    @Body('fileId') fileId: string,
    @Body('filename') filename: string,
    @Body('department') department: string,
    @Body('category') category: string,
    @Body('project') project: string,
  ) {
    return this.driveService.syncFile(fileId, filename, department, category, project);
  }
}
