import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleGenAI } from '@google/genai';
import { ConfigService } from '@nestjs/config';
import * as pdfParse from 'pdf-parse';

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
   * Main method to ingest a PDF buffer, parse it, and store embeddings.
   */
  async ingestDocument(filename: string, fileBuffer: Buffer, type: string = 'document') {
    this.logger.log(`Starting ingestion for ${filename}...`);

    // 1. Parse PDF to extract text
    const data = await pdfParse(fileBuffer);
    const text = data.text;

    if (!text || text.trim().length === 0) {
      throw new Error('No text found in PDF.');
    }

    // 2. Chunk the text
    const chunks = this.chunkText(text, 1000); // ~1000 characters per chunk
    this.logger.log(`Extracted ${chunks.length} chunks from ${filename}`);

    // 3. Create the Document record in the database
    const document = await this.prisma.document.create({
      data: {
        filename,
        type,
        metadata: { pages: data.numpages },
      },
    });

    // 4. Generate embeddings and save chunks
    for (const chunk of chunks) {
      if (chunk.trim() === '') continue;

      // Call Gemini for embedding
      const response = await this.ai.models.embedContent({
        model: 'text-embedding-004',
        contents: chunk,
      });

      const embedding = response.embeddings[0].values;

      // Because we use pgvector and Prisma's Unsupported type for embeddings,
      // we must use a raw SQL query to insert the vector securely.
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
    }

    this.logger.log(`Successfully ingested ${filename}`);
    return { success: true, documentId: document.id, chunks: chunks.length };
  }

  /**
   * Helper to split text into manageable chunks.
   * A basic semantic-aware or length-based chunker.
   */
  private chunkText(text: string, chunkSize: number): string[] {
    // Simple naive chunking by paragraphs/newlines first, then length
    const paragraphs = text.split(/\n\s*\n/);
    const chunks: string[] = [];
    let currentChunk = '';

    for (const paragraph of paragraphs) {
      if (currentChunk.length + paragraph.length > chunkSize) {
        if (currentChunk.trim().length > 0) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = paragraph;
      } else {
        currentChunk += '\n\n' + paragraph;
      }
    }

    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }
}
