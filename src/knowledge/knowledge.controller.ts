import { Controller, Post, Body, HttpException, HttpStatus, Get, Delete, Param, Query, UseInterceptors, UploadedFile, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { KnowledgeService, StructuredKnowledgeInput } from './knowledge.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('api/knowledge')
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  @Post('ingest-json')
  @UseGuards(AuthGuard)
  async ingestJson(
    @Body() body: { sourceName: string; data: StructuredKnowledgeInput[]; department?: string; category?: string; project?: string },
  ) {
    if (!body.sourceName) {
      throw new HttpException('sourceName is required', HttpStatus.BAD_REQUEST);
    }
    if (!body.data || !Array.isArray(body.data)) {
      throw new HttpException('data must be an array of objects', HttpStatus.BAD_REQUEST);
    }

    try {
      const result = await this.knowledgeService.ingestStructuredData(
        body.sourceName,
        body.data,
        body.department || 'general',
        body.category,
        body.project,
      );
      return { message: 'Structured data ingested successfully', data: result };
    } catch (error: any) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('upload')
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { department?: string; category?: string; project?: string },
  ) {
    if (!file) {
      throw new HttpException('File is required', HttpStatus.BAD_REQUEST);
    }

    try {
      const result = await this.knowledgeService.ingestFile(
        file,
        body.department || 'general',
        body.category,
        body.project,
      );
      return { message: 'File uploaded and ingested successfully', data: result };
    } catch (error: any) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get()
  async getKnowledge(
    @Query('department') department?: string,
    @Query('category') category?: string,
    @Query('project') project?: string,
  ) {
    const docs = await this.knowledgeService.getAllDocuments({ department, category, project });
    return { data: docs };
  }

  @Get('departments')
  async getDepartmentStats() {
    const stats = await this.knowledgeService.getDepartmentStats();
    return { data: stats };
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  async deleteKnowledge(@Param('id') id: string) {
    await this.knowledgeService.deleteDocument(id);
    return { success: true, message: 'Document deleted' };
  }
}
