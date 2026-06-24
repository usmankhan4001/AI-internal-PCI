import { Controller, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { KnowledgeService, StructuredKnowledgeInput } from './knowledge.service';

@Controller('api/knowledge')
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  @Post('ingest-json')
  async ingestJson(
    @Body('sourceName') sourceName: string,
    @Body('data') data: StructuredKnowledgeInput[]
  ) {
    if (!sourceName) {
      throw new HttpException('sourceName is required', HttpStatus.BAD_REQUEST);
    }
    if (!data || !Array.isArray(data)) {
      throw new HttpException('data must be an array of objects', HttpStatus.BAD_REQUEST);
    }

    try {
      const result = await this.knowledgeService.ingestStructuredData(sourceName, data);
      return { message: 'Structured data ingested successfully', data: result };
    } catch (error: any) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
