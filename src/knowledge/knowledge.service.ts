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

      const embedding = response.embeddings?.[0]?.values;
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
  /**
   * Search structured knowledge using pgvector cosine distance.
   */
  async search(query: string, topK: number = 3): Promise<StructuredKnowledgeInput[]> {
    this.logger.log(`Searching knowledge base for: "${query}"`);

    // 1. Embed the user query
    const response = await this.ai.models.embedContent({
      model: 'text-embedding-004',
      contents: query,
    });
    
    const embedding = response.embeddings?.[0]?.values;
    if (!embedding) {
      throw new Error('Failed to generate embedding for search query');
    }

    // 2. Perform vector similarity search using Prisma raw query (<=> is cosine distance)
    const results = await this.prisma.$queryRaw<
      Array<{ id: string; content: string; distance: number }>
    >`
      SELECT "id", "content", "embedding" <=> ${embedding}::vector AS distance
      FROM "DocumentChunk"
      ORDER BY distance ASC
      LIMIT ${topK};
    `;

    // 3. Map the raw JSON strings back to StructuredKnowledgeInput
    return results.map((row: any) => JSON.parse(row.content) as StructuredKnowledgeInput);
  }

  async getAllDocuments() {
    return this.prisma.document.findMany({
      include: {
        _count: { select: { chunks: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async deleteDocument(id: string) {
    // Due to constraints, delete chunks first then document
    await this.prisma.documentChunk.deleteMany({ where: { documentId: id } });
    return this.prisma.document.delete({ where: { id } });
  }
}
