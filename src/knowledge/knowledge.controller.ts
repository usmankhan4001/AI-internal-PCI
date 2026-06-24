import { Controller, Post, UseInterceptors, UploadedFile, HttpException, HttpStatus, Body } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { KnowledgeService } from './knowledge.service';

@Controller('api/knowledge')
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  @Post('ingest-document')
  @UseInterceptors(FileInterceptor('file'))
  async ingestDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body('type') type: string = 'brochure'
  ) {
    if (!file) {
      throw new HttpException('No file uploaded', HttpStatus.BAD_REQUEST);
    }

    if (file.mimetype !== 'application/pdf') {
      throw new HttpException('Only PDF files are supported', HttpStatus.BAD_REQUEST);
    }

    try {
      const result = await this.knowledgeService.ingestDocument(
        file.originalname,
        file.buffer,
        type
      );
      return { message: 'Document ingested successfully', data: result };
    } catch (error: any) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
