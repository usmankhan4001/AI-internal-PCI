import { Client } from 'pg';
import { GoogleGenAI } from '@google/genai';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const KNOWLEDGE_DIR = path.join(__dirname, 'knowledge_base');

async function seed() {
  console.log('Connecting to database...');
  await client.connect();

  const files = fs.readdirSync(KNOWLEDGE_DIR).filter(f => f.endsWith('.json'));
  console.log(`Found ${files.length} JSON files to embed and ingest.`);

  for (const file of files) {
    const filePath = path.join(KNOWLEDGE_DIR, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    // Create Document record
    const docId = uuidv4();
    await client.query(
      `INSERT INTO "Document" ("id", "filename", "type", "metadata", "createdAt") 
       VALUES ($1, $2, $3, $4, NOW())`,
      [docId, file, 'structured-json', { source: 'local_extract', chunks: data.length }]
    );

    console.log(`\nIngesting ${file} (${data.length} chunks)...`);
    let count = 0;

    for (const chunk of data) {
      const textToEmbed = `Category: ${chunk.category}\nTopic: ${chunk.topic}\nContent: ${chunk.content}`;
      
      try {
        const response = await ai.models.embedContent({
          model: 'text-embedding-004',
          contents: textToEmbed,
        });

        const embedding = response.embeddings?.[0]?.values;
        if (!embedding) throw new Error('No embedding returned');
        const fullJsonContent = JSON.stringify(chunk);

        // Convert JS array to postgres vector format string e.g. '[0.1, 0.2, ...]'
        const vectorString = `[${embedding.join(',')}]`;

        await client.query(
          `INSERT INTO "DocumentChunk" ("id", "documentId", "content", "embedding", "createdAt")
           VALUES ($1, $2, $3, $4::vector, NOW())`,
          [uuidv4(), docId, fullJsonContent, vectorString]
        );
        count++;
        process.stdout.write(`\r  Embedded ${count}/${data.length} chunks`);
      } catch (err: any) {
        console.error(`\n  Failed to embed chunk in ${file}: ${err.message}`);
      }
    }
    console.log(`\n  Completed ${file}`);
  }

  console.log('\nKnowledge Base completely seeded!');
  await client.end();
}

seed().catch(e => {
  console.error(e);
  process.exit(1);
});
