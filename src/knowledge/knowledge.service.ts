import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleGenAI } from '@google/genai';
import { ConfigService } from '@nestjs/config';
const pdfParse = require('pdf-parse');

export interface StructuredKnowledgeInput {
  category: string;
  topic: string;
  content: string;
  metadata?: any;
}

const DISTANCE_THRESHOLD = 0.50; // Cosine distance cutoff (values > 0.50 are irrelevant noise)

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
  async ingestStructuredData(
    sourceName: string,
    data: StructuredKnowledgeInput[],
    department: string = 'general',
    category?: string,
    project?: string,
  ) {
    this.logger.log(`Starting structured ingestion for source: ${sourceName}...`);

    if (!Array.isArray(data) || data.length === 0) {
      throw new HttpException('Input must be a non-empty array of structured knowledge.', HttpStatus.BAD_REQUEST);
    }

    const document = await this.prisma.document.create({
      data: {
        filename: sourceName,
        type: 'structured-json',
        department,
        category: category || null,
        project: project || null,
        sourceType: 'CHAT_UPLOAD',
        metadata: { items: data.length },
      },
    });

    let ingestedCount = 0;

    for (const item of data) {
      if (!item.content || item.content.trim() === '') continue;

      const textToEmbed = `Category: ${item.category}\nTopic: ${item.topic}\nDetails: ${item.content}`;

      const response = await this.ai.models.embedContent({
        model: 'gemini-embedding-001',
        contents: textToEmbed,
        config: { outputDimensionality: 768 },
      });

      const embedding = response.embeddings?.[0]?.values;
      const fullJsonContent = JSON.stringify(item);

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
   * Ingest an uploaded file (PDF, TXT, etc.) — extract text, chunk, and embed.
   */
  async ingestFile(
    file: Express.Multer.File,
    department: string = 'general',
    category?: string,
    project?: string,
  ) {
    this.logger.log(`Ingesting file: ${file.originalname} (${file.mimetype})`);

    let text = '';

    if (file.mimetype === 'application/pdf') {
      const parsed = await pdfParse(file.buffer);
      text = parsed.text;
    } else if (file.mimetype === 'text/plain' || file.mimetype === 'text/csv') {
      text = file.buffer.toString('utf-8');
    } else {
      throw new HttpException(
        `Unsupported file type: ${file.mimetype}. Supported: PDF, TXT, CSV`,
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!text || text.trim().length === 0) {
      throw new HttpException('No text could be extracted from the file.', HttpStatus.BAD_REQUEST);
    }

    const document = await this.prisma.document.create({
      data: {
        filename: file.originalname,
        type: file.mimetype.split('/').pop() || 'unknown',
        department,
        category: category || null,
        project: project || null,
        sourceType: 'CHAT_UPLOAD',
        metadata: { size: file.size, mimetype: file.mimetype },
      },
    });

    const chunks = this.chunkText(text, 500, 50);
    let ingestedCount = 0;

    for (const chunk of chunks) {
      if (chunk.trim().length < 20) continue;

      const response = await this.ai.models.embedContent({
        model: 'gemini-embedding-001',
        contents: chunk,
        config: { outputDimensionality: 768 },
      });

      const embedding = response.embeddings?.[0]?.values;

      await this.prisma.$executeRaw`
        INSERT INTO "DocumentChunk" ("id", "documentId", "content", "embedding", "createdAt")
        VALUES (
          gen_random_uuid(),
          ${document.id},
          ${chunk},
          ${embedding}::vector,
          NOW()
        )
      `;
      ingestedCount++;
    }

    this.logger.log(`Successfully ingested ${ingestedCount} chunks from ${file.originalname}`);
    return { success: true, documentId: document.id, filename: file.originalname, ingestedCount };
  }

  /**
   * Search structured knowledge using pgvector distance cutoff & metadata joining.
   */
  async search(
    query: string,
    topK: number = 5,
    filters?: { department?: string; category?: string; project?: string }
  ): Promise<StructuredKnowledgeInput[]> {
    this.logger.log(`Searching knowledge base for: "${query}"`);

    const response = await this.ai.models.embedContent({
      model: 'gemini-embedding-001',
      contents: query,
      config: { outputDimensionality: 768 },
    });

    const embedding = response.embeddings?.[0]?.values;
    if (!embedding) {
      throw new Error('Failed to generate embedding for search query');
    }

    const deptFilter = filters?.department ? `%${filters.department.toLowerCase()}%` : null;
    const catFilter = filters?.category ? `%${filters.category.toLowerCase()}%` : null;
    const projFilter = filters?.project ? `%${filters.project.toLowerCase()}%` : null;

    const results = await this.prisma.$queryRaw<
      Array<{
        id: string;
        content: string;
        filename: string;
        project: string | null;
        department: string;
        category: string | null;
        distance: number;
      }>
    >`
      SELECT 
        dc."id", 
        dc."content", 
        d."filename", 
        d."project", 
        d."department", 
        d."category",
        (dc."embedding" <=> ${embedding}::vector) AS distance
      FROM "DocumentChunk" dc
      JOIN "Document" d ON d."id" = dc."documentId"
      WHERE (dc."embedding" <=> ${embedding}::vector) < ${DISTANCE_THRESHOLD}
        AND (${deptFilter}::text IS NULL OR LOWER(d."department") LIKE ${deptFilter})
        AND (${catFilter}::text IS NULL OR LOWER(d."category") LIKE ${catFilter})
        AND (${projFilter}::text IS NULL OR LOWER(d."project") LIKE ${projFilter})
      ORDER BY distance ASC
      LIMIT ${topK};
    `;

    // Map raw query back cleanly, preserving project and category
    return results.map((row) => {
      try {
        const parsed = JSON.parse(row.content);
        return {
          category: parsed.category || row.category || 'general',
          topic: parsed.topic || row.filename,
          content: parsed.content || row.content,
          metadata: {
            project: row.project,
            department: row.department,
            filename: row.filename,
            distance: row.distance,
            ...(parsed.metadata || {}),
          },
        };
      } catch {
        return {
          category: row.category || 'document',
          topic: row.filename,
          content: row.content,
          metadata: {
            project: row.project,
            department: row.department,
            distance: row.distance,
          },
        };
      }
    });
  }

  async getAllDocuments(filters?: { department?: string; category?: string; project?: string }) {
    const where: any = {};
    if (filters?.department) where.department = { contains: filters.department, mode: 'insensitive' };
    if (filters?.category) where.category = { contains: filters.category, mode: 'insensitive' };
    if (filters?.project) where.project = { contains: filters.project, mode: 'insensitive' };

    return this.prisma.document.findMany({
      where,
      include: {
        _count: { select: { chunks: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getDepartmentStats() {
    const docs = await this.prisma.document.findMany({
      select: { department: true, category: true, project: true },
    });

    const stats: Record<string, { count: number; categories: Set<string>; projects: Set<string> }> = {};

    for (const doc of docs) {
      if (!stats[doc.department]) {
        stats[doc.department] = { count: 0, categories: new Set(), projects: new Set() };
      }
      stats[doc.department].count++;
      if (doc.category) stats[doc.department].categories.add(doc.category);
      if (doc.project) stats[doc.department].projects.add(doc.project);
    }

    return Object.entries(stats).map(([dept, data]) => ({
      department: dept,
      documentCount: data.count,
      categories: [...data.categories],
      projects: [...data.projects],
    }));
  }

  async deleteDocument(id: string) {
    await this.prisma.documentChunk.deleteMany({ where: { documentId: id } });
    return this.prisma.document.delete({ where: { id } });
  }

  private chunkText(text: string, chunkSize: number, overlap: number): string[] {
    const chunks: string[] = [];
    let start = 0;
    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      chunks.push(text.slice(start, end));
      start += chunkSize - overlap;
    }
    return chunks;
  }
}
