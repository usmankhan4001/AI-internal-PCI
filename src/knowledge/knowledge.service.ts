import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleGenAI } from '@google/genai';
import { ConfigService } from '@nestjs/config';

export interface StructuredKnowledgeInput {
  category: string;
  topic: string;
  content: string;
  metadata?: any;
}

@Injectable()
export class KnowledgeService {
  private readonly logger = new Logger(KnowledgeService.name);
  private readonly ai: GoogleGenAI;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (apiKey) {
      this.ai = new GoogleGenAI({ apiKey });
    } else {
      this.logger.warn('GEMINI_API_KEY is not set. Embeddings will fail.');
    }
  }

  /**
   * Ingest structured JSON arrays for zero-hallucination factual retrieval.
   */
  async ingestStructuredData(sourceName: string, data: StructuredKnowledgeInput[]) {
    this.logger.log(`Starting structured ingestion for source: ${sourceName}...`);

    if (!Array.isArray(data) || data.length === 0) {
      throw new HttpException('Input must be a non-empty array of structured knowledge.', HttpStatus.BAD_REQUEST);
    }

    // Create a record for this data source
    const document = await this.prisma.document.create({
      data: {
        filename: sourceName,
        type: 'structured-json',
        metadata: { items: data.length },
      },
    });

    let ingestedCount = 0;

    for (const item of data) {
      if (!item.content || item.content.trim() === '') continue;

      // Construct a highly rich string for embedding to ensure perfect semantic matching
      const textToEmbed = `Category: ${item.category}\nTopic: ${item.topic}\nDetails: ${item.content}`;

      // Call Gemini for embedding
      const response = await this.ai.models.embedContent({
        model: 'text-embedding-004',
        contents: textToEmbed,
      });

      const embedding = response.embeddings[0].values;
      const fullJsonContent = JSON.stringify(item);

      // Store the raw JSON string as the content alongside the vector embedding
      await this.prisma.$executeRaw`
        INSERT INTO "DocumentChunk" ("id", "documentId", "content", "embedding", "createdAt")
        VALUES (
          gen_random_uuid(), 
          ${document.id}, 
          ${fullJsonContent}, 
          ${embedding}::vector, 
          NOW()
        )
      `;
      ingestedCount++;
    }

    this.logger.log(`Successfully ingested ${ingestedCount} structured items from ${sourceName}`);
    return { success: true, documentId: document.id, ingestedCount };
  }
}
